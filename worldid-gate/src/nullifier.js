/**
 * Nullifier canonicalization.
 *
 * This file is the definition of "the same human", and it has to agree exactly
 * with the platform's `canonicalizeNullifier` (private repo,
 * libs/util/src/worldid/nullifier.ts). If the two ever disagree, the platform's
 * unique index stops colliding for a person the gate considers already seen,
 * and that person can claim the welcome credit twice.
 *
 * Two facts drive the whole file:
 *
 *   1. IDKit returns the nullifier as 0x-prefixed hex. The platform accepts
 *      decimal only and rejects hex with a 400. Same number, two spellings, so
 *      one side has to convert. It converts here, because the gate is the only
 *      component that ever sees an IDKit payload.
 *
 *   2. "123" and "0123" are DISTINCT keys in a unique index. Verified against a
 *      real MongoDB, not assumed. Without stripping leading zeros the fence is
 *      defeatable once per zero added, up to the field width.
 */

/** A field element is below 2^254, so it never needs more than 64 hex digits. */
const HEX_RE = /^0[xX][0-9a-fA-F]{1,64}$/;
/** 2^254 has 77 decimal digits; 78 is the generous bound the platform uses. */
const DEC_RE = /^\d{1,78}$/;

/**
 * Canonical decimal spelling, or `null` when the input is not a usable
 * nullifier. `null` means "not verified" and must never be treated as a
 * pass-through.
 *
 * Accepts decimal or 0x-hex. Total by construction: `String(x)` runs a
 * caller-supplied `toString` and can throw, and this sits on the path that
 * decides whether money moves, so a throw would surface as a 500 rather than
 * as "not verified".
 */
export function canonicalizeNullifier(raw) {
  let trimmed;
  try {
    trimmed = String(raw ?? '').trim();
  } catch {
    return null;
  }

  let value;
  if (DEC_RE.test(trimmed)) {
    value = BigInt(trimmed);
  } else if (HEX_RE.test(trimmed)) {
    value = BigInt(trimmed);
  } else {
    return null;
  }

  // BigInt strips leading zeros and cannot lose precision on an integer
  // string, unlike Number. Both regexes bound the length, so the conversion
  // cannot grow the value.
  const canonical = value.toString();

  // Zero is not a real field element. Accepting it would pin the entire
  // one-per-human fence to a single row.
  if (canonical === '0') return null;

  return canonical;
}

/** True when `raw` is already the canonical spelling of itself. */
export function isCanonical(raw) {
  const c = canonicalizeNullifier(raw);
  return c !== null && c === raw;
}
