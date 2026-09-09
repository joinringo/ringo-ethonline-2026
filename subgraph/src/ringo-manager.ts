import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  QuestionCreated,
  RingoCreatedAndFilled,
  RingoResolved,
  RingoInvalidated,
} from "../generated/RingoManager/RingoManager";
import { Market, Ringo, Resolution } from "../generated/schema";
import { RingoContract } from "../generated/RingoManager/RingoContract";
import * as abi from "./abi-adapters";
import { ringoKey } from "./ringo-id";
import {
  ZERO_BI,
  countActiveTrader,
  countParticipant,
  creditRecord,
  eventId,
  loadDailyStat,
  loadGlobal,
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

    let global = loadGlobal();
    global.markets = global.markets + 1;
    global.save();
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

  // The claim never reaches a log: RingoManager takes it as `string calldata`
  // and emits nothing carrying it. The factory does deploy a contract per ringo
  // though, its address is on this event, and getRingoConfig() there returns
  // the text. One call per fill is what an events-only index cannot do and is
  // the whole reason this data source declares a second ABI.
  //
  // try_ rather than a plain call on purpose: a revert has to leave the claim
  // null and the fill intact, not fail the handler and stall the sync.
  let ringoAddress = abi.fillRingoAddress(event);
  let config = RingoContract.bind(ringoAddress).try_getRingoConfig();
  if (!config.reverted) {
    market.claim = config.value.getClaim();
    market.assertionId = config.value.getAssertionId().toHexString();
  }

  let ringo = new Ringo(eventId(event));
  ringo.market = market.id;
  ringo.contractAddress = ringoAddress;
  // Fixed by the contract, not inferred: createAndFillRingo documents userA as
  // the YES side and fills the two sides in that order.
  ringo.outcomeA = "YES";
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

  // resolveRingo is caller-idempotent on this contract and does get retried,
  // so one market can emit RingoResolved many times. Measured on the deployed
  // index: 245 markets carried more than one resolution, the worst eleven of
  // them inside a single transaction with an identical winner and amount. The
  // Resolution rows are an append-only audit trail and all of them are kept,
  // but the win/loss counters must be credited ONCE per market or the
  // leaderboard inflates. It did: sum(Trader.wins) was 9,664, exactly the
  // Resolution row count, against 9,403 resolved markets, so 261 wins were
  // phantom. Our own ops wallet held 63 of them.
  //
  // Guarding on market.resolution rather than market.status is deliberate:
  // invalidation can overwrite the status, and handler writes are visible to
  // later handlers in the same block, so this holds even for duplicates that
  // share a transaction.
  let firstResolution = market.resolution == null;

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

  if (firstResolution) {
    // Must come after market.save(): both of these read this market's fills
    // back out of the store through the derived field.
    let winner = abi.resAddress(event);
    settleClaim(market, winner);
    creditRecord(market, winner, event.block.timestamp);
  }
}

/**
 * Records whether the claim held, from the side the winner sat on.
 *
 * userA is the YES participant by construction, so the winning address is the
 * verdict: side A means the claim was true, side B means it was not. Left null
 * when the fill predates this index, because there is no pair to place the
 * winner against — an unanswered question rather than a false one.
 */
function settleClaim(market: Market, winner: Address): void {
  let fills = market.ringos.load();
  if (fills.length == 0) return;

  let winnerId = winner.toHexString();
  for (let i = 0; i < fills.length; i++) {
    if (fills[i].userA == winnerId) {
      market.claimHeld = true;
      market.save();
      return;
    }
    if (fills[i].userB == winnerId) {
      market.claimHeld = false;
      market.save();
      return;
    }
  }
}

export function handleRingoInvalidated(event: RingoInvalidated): void {
  let id = ringoKey(event.params.ringoId);

  let market = loadOrStubMarket(id, event.block.timestamp);
  market.status = "INVALID";
  market.resolvedAt = event.block.timestamp;
  // outcome stays null: an invalidated market has no winning side
  market.save();
}
