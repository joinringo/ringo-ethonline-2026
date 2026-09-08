import { BigInt } from "@graphprotocol/graph-ts";
import {
  QuestionCreated,
  RingoCreatedAndFilled,
  RingoResolved,
  RingoInvalidated,
} from "../generated/RingoManager/RingoManager";
import { Market, Ringo, Resolution } from "../generated/schema";
import * as abi from "./abi-adapters";
import { ringoKey } from "./ringo-id";
import {
  ZERO_BI,
  countActiveTrader,
  countParticipant,
  creditRecord,
  eventId,
  loadDailyStat,
  loadTrader,
} from "./helpers";

/**
 * Every event carries ringoId as its first argument — hashed, because it is
 * indexed on a dynamic type, so src/ringo-id.ts keys on the hash. Every one of
 * them can arrive for a market this subgraph never saw created.
 *
 * That is not an edge case here, it is most of the history. The current
 * RingoCreatedAndFilled signature only starts at block 85629763 (April 2026),
 * while resolutions run from the start block: 9,654 RingoResolved against
 * 8,771 fills. Markets created by the v1 event — 2,453 of them — resolve
 * inside our window with no creation we decode.
 *
 * Returning early on those would drop about a fifth of all settlements, and
 * the subgraph would look healthy while doing it. So we stub.
 */
function loadOrStubMarket(id: string, timestamp: BigInt): Market {
  let market = Market.load(id);
  if (market == null) {
    market = new Market(id);
    market.tags = [];
    market.status = "OPEN";
    market.createdAt = timestamp;
    market.volume = ZERO_BI;
    market.fills = 0;
    market.participants = 0;
  }
  return market as Market;
}

export function handleQuestionCreated(event: QuestionCreated): void {
  let id = ringoKey(event.params.ringoId);

  let market = loadOrStubMarket(id, event.block.timestamp);
  market.questionId = abi.qcQuestionId(event).toHexString();
  market.createdAt = event.block.timestamp;
  market.save();
}

export function handleRingoCreatedAndFilled(event: RingoCreatedAndFilled): void {
  let id = ringoKey(event.params.ringoId);

  let timestamp = event.block.timestamp;
  let market = loadOrStubMarket(id, timestamp);

  let amountA = abi.fillAmountA(event);
  let amountB = abi.fillAmountB(event);
  let total = amountA.plus(amountB);

  let traderA = loadTrader(abi.fillUserA(event), timestamp);
  let traderB = loadTrader(abi.fillUserB(event), timestamp);
  traderA.volume = traderA.volume.plus(amountA);
  traderB.volume = traderB.volume.plus(amountB);
  traderA.save();
  traderB.save();

  let ringo = new Ringo(eventId(event));
  ringo.market = market.id;
  ringo.userA = traderA.id;
  ringo.userB = traderB.id;
  ringo.amountA = amountA;
  ringo.amountB = amountB;
  ringo.timestamp = timestamp;
  ringo.tx = event.transaction.hash;
  ringo.traders = [traderA.id, traderB.id];
  ringo.save();

  market.volume = market.volume.plus(total);
  market.fills = market.fills + 1;
  countParticipant(market, traderA.id);
  countParticipant(market, traderB.id);
  market.save();

  let stat = loadDailyStat(timestamp);
  stat.volume = stat.volume.plus(total);
  stat.fills = stat.fills + 1;
  countActiveTrader(stat, traderA.id);
  countActiveTrader(stat, traderB.id);
  stat.save();
}

export function handleRingoResolved(event: RingoResolved): void {
  let id = ringoKey(event.params.ringoId);

  let market = loadOrStubMarket(id, event.block.timestamp);
  let outcome = abi.resOutcome(event);

  let resolution = new Resolution(eventId(event));
  resolution.market = market.id;
  resolution.outcome = outcome;
  resolution.resolver = abi.resAddress(event);
  resolution.timestamp = event.block.timestamp;
  resolution.save();

  market.status = "RESOLVED";
  market.outcome = outcome;
  market.resolvedAt = event.block.timestamp;
  market.resolution = resolution.id;
  market.save();

  // Must come after market.save(): creditRecord reads this market's fills back
  // out of the store through the derived field.
  creditRecord(market, abi.resAddress(event), event.block.timestamp);
}

export function handleRingoInvalidated(event: RingoInvalidated): void {
  let id = ringoKey(event.params.ringoId);

  let market = loadOrStubMarket(id, event.block.timestamp);
  market.status = "INVALID";
  market.resolvedAt = event.block.timestamp;
  // outcome stays null: an invalidated market has no winning side
  market.save();
}
