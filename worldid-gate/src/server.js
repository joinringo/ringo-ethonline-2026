/**
 * The gate's HTTP surface.
 *
 * Three endpoints, and only the first one is called by the Ringo platform:
 *
 *   GET  /status?nullifier=<decimal>   the platform. Returns {"verified": bool}
 *   POST /verify                       the claim UI. Forwards a proof to World
 *   GET  /health                       liveness
 *
 * Two rules hold everywhere in this file, because the platform fails closed on
 * anything else:
 *
 *   - Never redirect. The platform sets maxRedirects: 0 deliberately: a
 *     redirect to a host that happens to serve {"verified":true} would
 *     otherwise be read as this service's own answer on a call that authorises
 *     a payment.
 *   - `verified` is a real JSON boolean. Not "true", not 1.
 */
import { createServer } from 'node:http';
import { config, configErrors } from './config.js';
import { canonicalizeNullifier } from './nullifier.js';
import { NullifierStore } from './store.js';
import { verifyProof } from './world.js';

const MAX_BODY_BYTES = 64 * 1024;

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('body too large');
    chunks.push(chunk);
  }
  if (size === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function createGate({ store, verify = verifyProof, logger = console } = {}) {
  const db = store ?? new NullifierStore(config.dbPath);

  const server = createServer(async (req, res) => {
    let url;
    try {
      url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    } catch {
      return send(res, 400, { error: 'bad_request' });
    }

    // ---- GET /status : the only endpoint the platform calls ---------------
    if (req.method === 'GET' && url.pathname === '/status') {
      const raw = url.searchParams.get('nullifier');
      const nullifier = canonicalizeNullifier(raw);

      if (nullifier === null) {
        // 400 rather than a quiet `false`. Both are safe (the platform treats
        // any non-200 as not verified), but a loud answer surfaces an
        // integration bug instead of hiding it as "this human is unknown".
        // `verified` is still present and still false, so a caller that only
        // reads the body is also correct.
        return send(res, 400, { verified: false, error: 'nullifier must be a decimal or 0x-hex field element' });
      }

      return send(res, 200, { verified: db.has(nullifier) === true });
    }

    // ---- POST /verify : the claim UI ------------------------------------
    if (req.method === 'POST' && url.pathname === '/verify') {
      let payload;
      try {
        payload = await readJson(req);
      } catch {
        return send(res, 400, { verified: false, error: 'bad_json' });
      }

      const result = await verify(payload);
      if (!result.ok) {
        // The reason is safe to return: it names which rule refused, never any
        // part of the proof.
        logger.warn?.(`[verify] refused: ${result.reason}${result.detail ? ` (${result.detail})` : ''}`);
        return send(res, result.reason === 'unreachable' ? 502 : 400, {
          verified: false,
          reason: result.reason,
        });
      }

      const nullifier = canonicalizeNullifier(result.nullifier);
      if (nullifier === null) {
        // World accepted the proof but handed back something this service
        // cannot canonicalise. Fail closed rather than store a spelling the
        // platform's index would treat as a different human.
        logger.error?.('[verify] World returned a nullifier that failed canonicalization');
        return send(res, 502, { verified: false, reason: 'uncanonical_nullifier' });
      }

      const first = db.record(nullifier, result.protocol, payload?.action ?? null);
      // The credential list is logged on every success, including when nothing
      // is enforcing it yet. It is how GATE_REQUIRE_CREDENTIAL gets turned on
      // from evidence rather than from a guess about World's response shape.
      logger.log?.(
        `[verify] ok protocol=${result.protocol} first_time=${first} ` +
        `credentials=[${(result.credentials ?? []).join(', ')}]`,
      );

      // The nullifier goes back so the claim UI can pass it to the platform's
      // POST /welcome-bonus/claim. It is not a secret: it is derived from the
      // person's identity commitment and is useless without a session.
      return send(res, 200, { verified: true, nullifier, first_time: first });
    }

    // ---- POST /rp-signature : deliberately not implemented ---------------
    if (req.method === 'POST' && url.pathname === '/rp-signature') {
      // The RP signature is secp256k1 ECDSA over keccak256, and the signing
      // key is what lets anyone forge a request from this app. Hand-rolling
      // that is the wrong call, so this endpoint wants the vendor's signer
      // (`@worldcoin/idkit-server`, `SignRequest`) rather than an
      // implementation written here. See README, "The one thing this does not do".
      return send(res, 501, {
        error: 'not_implemented',
        detail: 'Use @worldcoin/idkit-server SignRequest with the RP signing key. See README.',
      });
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      return send(res, 200, { ok: true, verified_nullifiers: db.count() });
    }

    return send(res, 404, { error: 'not_found' });
  });

  return { server, store: db };
}

// Only start listening when run directly, so the tests can import the factory.
if (import.meta.url === `file://${process.argv[1]}`) {
  const errs = configErrors();
  for (const e of errs) console.warn(`[config] ${e}`);
  if (config.allowLegacyProofs) {
    console.warn(
      '[config] GATE_ALLOW_LEGACY_PROOFS=true. One person can now hold two ' +
      'different nullifiers (v3 and v4) and claim twice. This is not a safe default.',
    );
  }
  const { server } = createGate();
  server.listen(config.port, () => {
    console.log(`worldid-gate listening on :${config.port}`);
    console.log(`  GET  /status?nullifier=<decimal>   platform contract`);
    console.log(`  POST /verify                       claim UI`);
  });
}
