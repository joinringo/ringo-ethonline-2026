/**
 * The World adapter, with `fetch` injected. No network.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyProof } from '../src/world.js';
import { config } from '../src/config.js';

// The adapter reads config at call time, so set it up once for these tests.
config.rpId = 'app_test';
config.action = 'claim-welcome-credit';
config.allowLegacyProofs = false;

const ok = (body, status = 200) => async () => ({
  status, json: async () => body,
});

test('accepts a v4 proof and takes the nullifier from the response', async () => {
  const res = await verifyProof(
    { protocol_version: '4.0', action: 'claim-welcome-credit', nonce: 'n', responses: [] },
    ok({ success: true, nullifier: '123', action: 'claim-welcome-credit' }),
  );
  assert.equal(res.ok, true);
  assert.equal(res.nullifier, '123');
  assert.equal(res.protocol, '4.0');
});

test('refuses a legacy v3 proof by default, because it is a second nullifier for one person', async () => {
  const res = await verifyProof(
    { protocol_version: '3.0', action: 'claim-welcome-credit', responses: [] },
    ok({ success: true, nullifier: '123' }),
  );
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'legacy_proof_refused');
});

test('accepts a legacy v3 proof only when explicitly opted in', async () => {
  config.allowLegacyProofs = true;
  try {
    const res = await verifyProof(
      { protocol_version: '3.0', action: 'claim-welcome-credit', responses: [] },
      ok({ success: true, nullifier: '123' }),
    );
    assert.equal(res.ok, true);
  } finally {
    config.allowLegacyProofs = false;
  }
});

test('success must be the literal boolean true', async () => {
  for (const success of ['true', 1, 'yes', null, undefined]) {
    const res = await verifyProof(
      { protocol_version: '4.0', action: 'claim-welcome-credit' },
      ok({ success, nullifier: '123' }),
    );
    assert.equal(res.ok, false, `success=${String(success)} must not pass`);
  }
});

test('a 200 with no nullifier is a refusal, not a pass', async () => {
  const res = await verifyProof(
    { protocol_version: '4.0', action: 'claim-welcome-credit' },
    ok({ success: true }),
  );
  assert.equal(res.ok, false);
  assert.equal(res.detail, 'response carried no nullifier');
});

test('any non-200 is a refusal', async () => {
  for (const status of [201, 301, 400, 404, 429, 500, 503]) {
    const res = await verifyProof(
      { protocol_version: '4.0', action: 'claim-welcome-credit' },
      ok({ success: true, nullifier: '123' }, status),
    );
    assert.equal(res.ok, false, `status ${status} must not pass`);
  }
});

test('a proof minted for another action is refused', async () => {
  const res = await verifyProof(
    { protocol_version: '4.0', action: 'some-other-action' },
    ok({ success: true, nullifier: '123' }),
  );
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'action_mismatch');
});

test('a network error or timeout fails closed and leaks no proof', async () => {
  const boom = async () => { const e = new Error('socket hang up'); throw e; };
  const res = await verifyProof({ protocol_version: '4.0', action: 'claim-welcome-credit' }, boom);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'unreachable');
  assert.equal(res.nullifier, null);
});

test('a malformed payload is refused before any network call', async () => {
  let called = false;
  const spy = async () => { called = true; return { status: 200, json: async () => ({}) }; };
  for (const bad of [null, undefined, 'x', 42, {}, { protocol_version: 4 }]) {
    const res = await verifyProof(bad, spy);
    assert.equal(res.ok, false);
  }
  assert.equal(called, false, 'no proof-shaped garbage should reach World');
});

// ---- credential enforcement -------------------------------------------------

test('reads the credential identifiers World reports', async () => {
  const res = await verifyProof(
    { protocol_version: '4.0', action: 'claim-welcome-credit' },
    ok({
      success: true,
      nullifier: '123',
      results: [{ identifier: 'selfie', success: true, nullifier: '123' }],
    }),
  );
  assert.equal(res.ok, true);
  assert.deepEqual(res.credentials, ['selfie']);
});

test('a credential World marked unsuccessful is not counted as presented', async () => {
  const res = await verifyProof(
    { protocol_version: '4.0', action: 'claim-welcome-credit' },
    ok({
      success: true,
      nullifier: '123',
      results: [{ identifier: 'selfie', success: false }],
    }),
  );
  assert.deepEqual(res.credentials, []);
});

test('an unreadable results field yields no credentials rather than throwing', async () => {
  for (const results of [undefined, null, 'selfie', {}, [null], [{ identifier: 7 }]]) {
    const res = await verifyProof(
      { protocol_version: '4.0', action: 'claim-welcome-credit' },
      ok({ success: true, nullifier: '123', results }),
    );
    assert.equal(res.ok, true, `results=${JSON.stringify(results)} should still verify`);
    assert.deepEqual(res.credentials, [], `results=${JSON.stringify(results)}`);
  }
});

test('with GATE_REQUIRE_CREDENTIAL set, a proof carrying another credential is refused', async () => {
  config.requiredCredential = 'selfie';
  try {
    const res = await verifyProof(
      { protocol_version: '4.0', action: 'claim-welcome-credit' },
      ok({
        success: true,
        nullifier: '123',
        results: [{ identifier: 'proof_of_human', success: true }],
      }),
    );
    assert.equal(res.ok, false);
    assert.equal(res.reason, 'credential_mismatch');
  } finally {
    config.requiredCredential = null;
  }
});

test('with GATE_REQUIRE_CREDENTIAL set, a response with no readable credential fails closed', async () => {
  config.requiredCredential = 'selfie';
  try {
    const res = await verifyProof(
      { protocol_version: '4.0', action: 'claim-welcome-credit' },
      ok({ success: true, nullifier: '123' }),
    );
    assert.equal(res.ok, false);
    assert.equal(res.reason, 'credential_mismatch');
  } finally {
    config.requiredCredential = null;
  }
});

test('with GATE_REQUIRE_CREDENTIAL set, the matching credential passes', async () => {
  config.requiredCredential = 'selfie';
  try {
    const res = await verifyProof(
      { protocol_version: '4.0', action: 'claim-welcome-credit' },
      ok({
        success: true,
        nullifier: '123',
        results: [
          { identifier: 'proof_of_human', success: true },
          { identifier: 'selfie', success: true },
        ],
      }),
    );
    assert.equal(res.ok, true);
    assert.equal(res.nullifier, '123');
  } finally {
    config.requiredCredential = null;
  }
});
