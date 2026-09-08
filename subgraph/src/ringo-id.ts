import { Bytes } from "@graphprotocol/graph-ts";

/**
 * ===========================================================================
 * The id every entity is keyed on: keccak256(ringoId), read straight off the
 * indexed topic.
 * ===========================================================================
 *
 * `ringoId` is declared `indexed` on a dynamic `bytes` type, so the log never
 * carries the value — Solidity puts keccak256(value) in the topic instead. The
 * plaintext survives only in the transaction's calldata.
 *
 * Reading it back from there is what this file used to do, and on this contract
 * it does not work. Every Ringo transaction is an ERC-4337 UserOperation: the
 * `to` is EntryPoint 0x0000000071727De22E5E9d8BAf0edAc6f37da032 and the input
 * is `handleOps(PackedUserOperation[],address)` (selector 0x765e827f), with the
 * actual RingoManager call nested inside `ops[i].callData`. Both traders are
 * smart accounts, so this is every transaction, not an edge case.
 *
 * Decoding `(bytes)` against that calldata is worse than failing. It succeeds,
 * and hands back a slice of the UserOp array — a long, plausible-looking blob
 * that differs per transaction. Keyed on that, a market created in one tx and
 * resolved in another gets two unrelated ids, so nothing ever joins and the
 * subgraph reports markets with zero fills while looking perfectly healthy.
 * That is exactly what the first deploy did.
 *
 * The topic hash has none of those problems. All four events carry the same
 * topic for the same ringo — verified on mainnet by pairing fills with their
 * own resolutions through it — so it is a total, collision-free join key that
 * is always present.
 *
 * The cost is that the id is not the human-readable ringoId. A caller that
 * holds one reaches its market with keccak256(ringoId); see docs/queries.md.
 * Recovering the plaintext as well would mean unwrapping handleOps → UserOp →
 * the account's `execute` → the RingoManager call, and picking the right op out
 * of a batch. That is worth doing as a nice-to-have field; it is not worth
 * making the primary key depend on it.
 */
export function ringoKey(ringoId: Bytes): string {
  return ringoId.toHexString();
}
