/**
 * Configuration, read once at boot.
 *
 * Reading process.env at the call site turns a missing variable into a 500
 * halfway through a demo. Everything that can be validated at boot is.
 */

function str(name, fallback = null) {
  const v = process.env[name];
  return v === undefined || v.trim() === '' ? fallback : v.trim();
}

function int(name, fallback) {
  const v = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

/**
 * Strict equality against the string "true". "TRUE", "1" and "yes" all mean
 * off, deliberately: an ambiguous value across environments must not
 * half-enable something that moves money. Same rule as the platform's flags.
 */
function flag(name) {
  return process.env[name] === 'true';
}

export const config = {
  port: int('GATE_PORT', 8787),
  dbPath: str('GATE_DB_PATH', './data/nullifiers.db'),

  /** Relying-party id from the World Developer Portal. Required by /verify. */
  rpId: str('WORLDID_RP_ID'),
  /** Verification base URL. The v4 domain is world.org, not worldcoin.org. */
  verifyBaseUrl: str('WORLDID_VERIFY_BASE_URL', 'https://developer.world.org/api/v4/verify'),
  /** The action string the proof must be bound to. */
  action: str('WORLDID_ACTION'),

  /**
   * Credential the proof must actually carry, e.g. `selfie`.
   *
   * Off by default, and that is a deliberate, temporary compromise rather than
   * a preference. Requesting a credential is a client-side parameter; only
   * World's response says which credential was really presented, and the exact
   * shape of that response has not yet been observed against a real proof.
   * Failing closed on an unconfirmed field name is how a working service starts
   * refusing everyone, so the gate LOGS the identifiers World returns on every
   * verification instead. One real proof settles the shape; set this to
   * `selfie` immediately afterwards and the requirement is enforced rather than
   * merely requested.
   */
  requiredCredential: str('GATE_REQUIRE_CREDENTIAL'),
  verifyTimeoutMs: int('WORLDID_VERIFY_TIMEOUT_MS', 8000),

  /**
   * Off by default, and it should stay off.
   *
   * `selfieCheckLegacy` is a v3 preset, and `allow_legacy_proofs: true` lets
   * World App satisfy the request with a v3 proof. A v3 proof and a v4 proof
   * for the SAME person carry DIFFERENT nullifiers, and no index can connect
   * them. Turn this on and one human claims the welcome credit twice while
   * every uniqueness check reports success. That is the exact failure this
   * service exists to prevent, so it is refused unless someone opts in
   * explicitly and knowingly.
   */
  allowLegacyProofs: flag('GATE_ALLOW_LEGACY_PROOFS'),
};

/** Problems that should stop the process rather than surface mid-demo. */
export function configErrors() {
  const errs = [];
  if (!config.rpId) errs.push('WORLDID_RP_ID is unset: POST /verify cannot work.');
  if (!config.action) errs.push('WORLDID_ACTION is unset: POST /verify cannot bind a proof to an action.');
  return errs;
}
