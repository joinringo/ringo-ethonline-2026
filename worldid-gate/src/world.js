/**
 * The World verification call.
 *
 * Contract, from the World developer docs (v4):
 *
 *   POST https://developer.world.org/api/v4/verify/{rp_id}
 *
 * The IDKit result payload is forwarded AS-IS. No field remapping: the docs
 * are explicit about that, and remapping is how a field quietly stops being
 * checked.
 *
 *   request  (uniqueness, v4) protocol_version "4.0", nonce, action,
 *                             responses[{identifier, issuer_schema_id,
 *                             nullifier, expires_at_min, proof, signal_hash}]
 *   request  (legacy, v3)     protocol_version "3.0", nonce, action,
 *                             responses[{identifier, proof, merkle_root,
 *                             nullifier, signal_hash, max_age}]
 *   200                       { success: true, action, nullifier, created_at,
 *                               environment, session_id, results, message }
 *   400/404                   { success: false, code, detail, results? }
 *
 * The nullifier this service records is the one in World's RESPONSE, never the
 * one in the client's payload. A client controls its own request body; it does
 * not control what World says back. Recording the client's copy would let
 * anyone register any nullifier they liked.
 */
import { config } from './config.js';

/** Everything the caller needs, and nothing that could leak a proof into a log. */
function fail(reason, detail) {
  return { ok: false, reason, detail: detail ?? null, nullifier: null, protocol: null };
}

export async function verifyProof(payload, fetchImpl = globalThis.fetch) {
  if (!config.rpId) return fail('not_configured', 'WORLDID_RP_ID is unset');
  if (payload === null || typeof payload !== 'object') return fail('bad_payload');

  const protocol = typeof payload.protocol_version === 'string' ? payload.protocol_version : null;
  if (protocol === null) return fail('bad_payload', 'protocol_version missing');

  // See config.allowLegacyProofs: a v3 and a v4 proof for the same person carry
  // different nullifiers, so accepting both spellings of one human defeats the
  // uniqueness fence entirely.
  if (protocol === '3.0' && !config.allowLegacyProofs) {
    return fail('legacy_proof_refused',
      'protocol_version 3.0 is refused: a legacy proof carries a different nullifier ' +
      'for the same person, which the uniqueness index cannot connect. ' +
      'Set GATE_ALLOW_LEGACY_PROOFS=true only if you accept that.');
  }

  // Bind the proof to the action this deployment expects. Without this check a
  // proof minted for any other action of the same RP would be accepted here.
  if (config.action && payload.action !== undefined && payload.action !== config.action) {
    return fail('action_mismatch');
  }

  const url = `${config.verifyBaseUrl.replace(/\/+$/, '')}/${encodeURIComponent(config.rpId)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.verifyTimeoutMs);

  let res;
  let body;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      redirect: 'manual',
    });
    body = await res.json().catch(() => null);
  } catch (err) {
    // Message only. An error object from a fetch implementation can carry the
    // request, and the request carries a proof.
    return fail('unreachable', err?.name === 'AbortError' ? 'timeout' : (err?.message ?? 'unknown'));
  } finally {
    clearTimeout(timer);
  }

  if (res.status !== 200) {
    return fail('rejected', typeof body?.code === 'string' ? body.code : `status_${res.status}`);
  }
  // Strict boolean. A string "true" is not a success.
  if (body?.success !== true) {
    return fail('rejected', typeof body?.code === 'string' ? body.code : 'success_not_true');
  }
  if (typeof body.nullifier !== 'string' || body.nullifier === '') {
    return fail('rejected', 'response carried no nullifier');
  }

  return { ok: true, reason: null, detail: null, nullifier: body.nullifier, protocol };
}
