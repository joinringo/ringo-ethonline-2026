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
  return { ok: false, reason, detail: detail ?? null, nullifier: null, protocol: null, credentials: [] };
}

export async function verifyProof(payload, fetchImpl = globalThis.fetch) {
  if (!config.rpId) return fail('not_configured', 'WORLDID_RP_ID is unset');
  if (payload === null || typeof payload !== 'object') return fail('bad_payload');

  const protocol = typeof payload.protocol_version === 'string' ? payload.protocol_version : null;
  if (protocol === null) return fail('bad_payload', 'protocol_version missing');

  // Protocol acceptance, in exactly one of two modes. Both fall through to the
  // action check and the World call below: a pinned deployment is not a
  // deployment with fewer checks.
  if (config.requireProtocol) {
    // Pinned to one version, so one human has exactly one nullifier whichever
    // version that is. This is the safe way to run on legacy proofs, and it is
    // what Selfie Check currently requires: World's docs say the preset
    // "currently uses World ID 3.0; World ID 4.0 support is not yet available".
    if (protocol !== config.requireProtocol) {
      return fail(
        'protocol_not_accepted',
        `this gate accepts only protocol_version ${config.requireProtocol}, got ${protocol}`,
      );
    }
  } else if (protocol === '3.0' && !config.allowLegacyProofs) {
    // Unpinned default. A v3 and a v4 proof for the same person carry different
    // nullifiers, so accepting both spellings of one human defeats the
    // uniqueness fence entirely.
    return fail('legacy_proof_refused',
      'protocol_version 3.0 is refused: a legacy proof carries a different nullifier ' +
      'for the same person, which the uniqueness index cannot connect. ' +
      'Prefer GATE_REQUIRE_PROTOCOL=3.0, which accepts v3 and refuses v4, over ' +
      'GATE_ALLOW_LEGACY_PROOFS=true, which accepts both and reintroduces the problem.');
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

  // Which credential World says was actually presented. A request can ask for
  // anything; only this says what arrived.
  const credentials = readCredentials(body);

  if (config.requiredCredential && !credentials.includes(config.requiredCredential)) {
    return fail(
      'credential_mismatch',
      `expected ${config.requiredCredential}, response carried [${credentials.join(', ') || 'nothing readable'}]`,
    );
  }

  return {
    ok: true,
    reason: null,
    detail: null,
    nullifier: body.nullifier,
    protocol,
    credentials,
  };
}

/**
 * The successful credential identifiers in a verify response.
 *
 * Tolerant on purpose: this is used to OBSERVE what World sends while the
 * response shape is still being confirmed, so an unexpected field must produce
 * an empty list rather than throw. It only becomes load-bearing once
 * `GATE_REQUIRE_CREDENTIAL` is set, and at that point an empty list refuses.
 */
export function readCredentials(body) {
  const results = Array.isArray(body?.results) ? body.results : [];
  return results
    .filter(r => r && typeof r.identifier === 'string' && r.success !== false)
    .map(r => r.identifier);
}
