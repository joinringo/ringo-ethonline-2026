/**
 * The /status contract, which is the only thing the Ringo platform calls, plus
 * the /verify fail-closed cases.
 *
 * These assert the contract from the platform's side: it treats anything other
 * than a 200 carrying the literal boolean `true` as "not verified". So the
 * tests check the wire shape, not just the handler's intent.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGate } from '../src/server.js';
import { NullifierStore } from '../src/store.js';

async function withGate(opts, fn) {
  const store = new NullifierStore(':memory:');
  const quiet = { log() {}, warn() {}, error() {} };
  const { server } = createGate({ store, logger: quiet, ...opts });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn({ base, store });
  } finally {
    await new Promise((r) => server.close(r));
    store.close();
  }
}

const raw = (res, body) => ({ status: res.status, body });
async function get(base, path) {
  const res = await fetch(`${base}${path}`, { redirect: 'manual' });
  return raw(res, await res.json());
}
async function post(base, path, payload) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    redirect: 'manual',
  });
  return raw(res, await res.json());
}

test('GET /status returns a real JSON boolean, not a string', async () => {
  await withGate({}, async ({ base, store }) => {
    store.record('123', '4.0', null);

    const hit = await get(base, '/status?nullifier=123');
    assert.equal(hit.status, 200);
    assert.equal(hit.body.verified, true);
    assert.equal(typeof hit.body.verified, 'boolean', 'the platform requires a literal boolean');

    const miss = await get(base, '/status?nullifier=124');
    assert.equal(miss.status, 200);
    assert.equal(miss.body.verified, false);
    assert.equal(typeof miss.body.verified, 'boolean');
  });
});

test('GET /status canonicalizes, so a leading zero is the same human', async () => {
  await withGate({}, async ({ base, store }) => {
    store.record('123', '4.0', null);
    for (const spelling of ['123', '0123', '000123', '0x7b', '0x007b']) {
      const r = await get(base, `/status?nullifier=${encodeURIComponent(spelling)}`);
      assert.equal(r.body.verified, true, `${spelling} must resolve to the same human`);
    }
  });
});

test('GET /status fails closed on a malformed or missing nullifier', async () => {
  await withGate({}, async ({ base }) => {
    for (const bad of ['', '0', 'abc', '12.5', '-1', '0x']) {
      const r = await get(base, `/status?nullifier=${encodeURIComponent(bad)}`);
      assert.equal(r.body.verified, false, `${bad} must not verify`);
      assert.notEqual(r.status, 200, 'a malformed input is answered loudly, not silently');
    }
    const none = await get(base, '/status');
    assert.equal(none.body.verified, false);
  });
});

test('GET /status never redirects', async () => {
  await withGate({}, async ({ base }) => {
    const res = await fetch(`${base}/status?nullifier=123`, { redirect: 'manual' });
    assert.ok(res.status < 300 || res.status >= 400, 'a 3xx would be read as this service answering');
    assert.equal(res.headers.get('location'), null);
  });
});

test('POST /verify records the nullifier World returns, not the one the client sent', async () => {
  const verify = async () => ({ ok: true, nullifier: '0x7b', protocol: '4.0', reason: null, detail: null });
  await withGate({ verify }, async ({ base, store }) => {
    const r = await post(base, '/verify', {
      protocol_version: '4.0',
      nullifier: '999999',          // a client-supplied value that must be ignored
      responses: [{ nullifier: '999999' }],
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.verified, true);
    assert.equal(r.body.nullifier, '123', 'canonicalized from World\'s response');
    assert.equal(store.has('123'), true);
    assert.equal(store.has('999999'), false, 'the client cannot register a nullifier of its choosing');
  });
});

test('POST /verify reports first_time only once for the same human', async () => {
  const verify = async () => ({ ok: true, nullifier: '123', protocol: '4.0', reason: null, detail: null });
  await withGate({ verify }, async ({ base }) => {
    const a = await post(base, '/verify', { protocol_version: '4.0' });
    const b = await post(base, '/verify', { protocol_version: '4.0' });
    assert.equal(a.body.first_time, true);
    assert.equal(b.body.first_time, false);
    assert.equal(b.body.verified, true, 'a repeat verification is still verified');
  });
});

test('POST /verify grants nothing when World refuses', async () => {
  const verify = async () => ({ ok: false, reason: 'rejected', detail: 'invalid_proof', nullifier: null, protocol: null });
  await withGate({ verify }, async ({ base, store }) => {
    const r = await post(base, '/verify', { protocol_version: '4.0' });
    assert.equal(r.body.verified, false);
    assert.equal(store.count(), 0, 'a refused proof must leave no trace');
  });
});

test('POST /verify fails closed when World is unreachable', async () => {
  const verify = async () => ({ ok: false, reason: 'unreachable', detail: 'timeout', nullifier: null, protocol: null });
  await withGate({ verify }, async ({ base, store }) => {
    const r = await post(base, '/verify', { protocol_version: '4.0' });
    assert.equal(r.status, 502);
    assert.equal(r.body.verified, false);
    assert.equal(store.count(), 0);
  });
});

test('POST /verify fails closed when World returns an uncanonicalizable nullifier', async () => {
  const verify = async () => ({ ok: true, nullifier: 'not-a-number', protocol: '4.0', reason: null, detail: null });
  await withGate({ verify }, async ({ base, store }) => {
    const r = await post(base, '/verify', { protocol_version: '4.0' });
    assert.equal(r.body.verified, false);
    assert.equal(r.body.reason, 'uncanonical_nullifier');
    assert.equal(store.count(), 0, 'better to store nothing than a spelling the platform reads as another human');
  });
});

test('unknown routes 404, and /rp-signature is honestly 501', async () => {
  await withGate({}, async ({ base }) => {
    assert.equal((await get(base, '/nope')).status, 404);
    const rp = await post(base, '/rp-signature', {});
    assert.equal(rp.status, 501, 'signing an identity request is not something to hand-roll');
  });
});
