/**
 * ===========================================================================
 * THE ONLY FILE THAT DEPENDS ON THE RingoManager ABI.
 * ===========================================================================
 *
 * Types AND indexed flags are now confirmed against Polygon mainnet. The
 * implementation behind the proxy is unverified, so abis/RingoManager.json was
 * reconstructed from the chain rather than downloaded:
 *
 *   keccak256(signature) == topic0, for all four events:
 *     QuestionCreated(bytes,bytes32)                                 0xbb2089…
 *     RingoCreatedAndFilled(bytes,address,address,uint256,uint256,address) 0x54a799…
 *     RingoResolved(bytes,address,uint256)                           0xfdc112…
 *     RingoInvalidated(bytes,uint256)                                0x42e8db…
 *
 *   indexed count == topic count, over 1000 sampled logs per event:
 *     QuestionCreated        3 topics, 0 data words → ringoId, questionId indexed
 *     RingoCreatedAndFilled  4 topics, 3 data words → ringoId, userA, userB indexed
 *     RingoResolved          3 topics, 1 data word  → ringoId, winner indexed
 *     RingoInvalidated       2 topics, 1 data word  → ringoId indexed
 *
 * The three __PENDING__ questions this file used to carry are answered:
 *
 *   1. indexed — see above. The earlier guess was wrong on three of four.
 *   2. The sixth address on RingoCreatedAndFilled is the per-ringo ESCROW, not
 *      the settlement token: 1000 distinct values across 1000 logs, and in
 *      tx 0xf9726a…b184 that address receives both USDC deposits and pays the
 *      1% fee to FeesManager 0xF1Ccb0…4E92.
 *   3. The uint256 on RingoResolved is a PAYOUT in raw USDC units (2000000 =
 *      2 USDC), not an outcome index. Nothing in the event says which side
 *      won; only who did. See resOutcome below.
 *
 * Parameter names: `ringoId`, `winner` and `amount` come from the decoded
 * signature a block explorer holds for RingoResolved. The rest are the names
 * this repo already used; they are ours, not the contract's, and only matter
 * to codegen.
 *
 * ringoId is deliberately absent from this file. It is indexed on a dynamic
 * type, so the log carries only its hash — see src/ringo-id.ts.
 */

import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  QuestionCreated,
  RingoCreatedAndFilled,
  RingoResolved,
  RingoInvalidated,
} from "../generated/RingoManager/RingoManager";

// --- QuestionCreated(bytes ringoId, bytes32 questionId) ---------------------

export function qcQuestionId(e: QuestionCreated): Bytes {
  return e.params.questionId;
}

// --- RingoCreatedAndFilled --------------------------------------------------
//     (bytes ringoId, address userA, address userB,
//      uint256 amountA, uint256 amountB, address escrow)

export function fillUserA(e: RingoCreatedAndFilled): Address {
  return e.params.userA;
}

export function fillUserB(e: RingoCreatedAndFilled): Address {
  return e.params.userB;
}

export function fillAmountA(e: RingoCreatedAndFilled): BigInt {
  return e.params.amountA;
}

export function fillAmountB(e: RingoCreatedAndFilled): BigInt {
  return e.params.amountB;
}

/**
 * The contract the factory deployed for this ringo. It holds both stakes, and
 * it is the only route to the claim text — see handleRingoCreatedAndFilled.
 */
export function fillRingoAddress(e: RingoCreatedAndFilled): Address {
  return e.params.ringoAddress;
}

// --- RingoResolved(bytes ringoId, address winner, uint256 amount) -----------

/**
 * Payout in raw USDC units. Kept behind the old adapter name because
 * Resolution.outcome / Market.outcome are already in the backend's queries;
 * renaming the schema field is a coordinated change, not an ABI fix.
 */
export function resOutcome(e: RingoResolved): BigInt {
  return e.params.amount;
}

/** The winning address. */
export function resAddress(e: RingoResolved): Address {
  return e.params.winner;
}

// --- RingoInvalidated(bytes ringoId, uint256 timestamp) ---------------------

/**
 * A unix timestamp, not a reason code and not a refunded amount: sampled
 * values decode to real dates (1758054672 → 2025-09-16T20:31:12Z).
 */
export function invValue(e: RingoInvalidated): BigInt {
  return e.params.timestamp;
}
