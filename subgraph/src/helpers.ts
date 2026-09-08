import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  DailyActiveTrader,
  DailyStat,
  Market,
  MarketParticipant,
  Trader,
} from "../generated/schema";

export const ZERO_BI = BigInt.fromI32(0);
export const SECONDS_PER_DAY = BigInt.fromI32(86400);

/**
 * Deterministic id for anything that maps one-to-one to a log.
 * Two events in the same tx get different ids; a reorg replays the same tx
 * and produces the same ids, so handlers stay idempotent.
 */
export function eventId(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
}

/** UTC day index. Sorts chronologically as a string because it is fixed-width for ~300 years. */
export function dayId(timestamp: BigInt): string {
  return timestamp.div(SECONDS_PER_DAY).toString();
}

export function dayStart(timestamp: BigInt): BigInt {
  return timestamp.div(SECONDS_PER_DAY).times(SECONDS_PER_DAY);
}

export function loadTrader(address: Address, timestamp: BigInt): Trader {
  let id = address.toHexString();
  let trader = Trader.load(id);
  if (trader == null) {
    trader = new Trader(id);
    trader.volume = ZERO_BI;
    trader.wins = 0;
    trader.losses = 0;
  }
  trader.lastActive = timestamp;
  return trader as Trader;
}

export function loadDailyStat(timestamp: BigInt): DailyStat {
  let id = dayId(timestamp);
  let stat = DailyStat.load(id);
  if (stat == null) {
    stat = new DailyStat(id);
    stat.date = dayStart(timestamp);
    stat.volume = ZERO_BI;
    stat.fills = 0;
    stat.fees = ZERO_BI;
    stat.activeTraders = 0;
  }
  return stat as DailyStat;
}

/**
 * Counts a trader toward Market.participants exactly once.
 * Returns true the first time this pair is seen.
 */
export function countParticipant(market: Market, traderId: string): boolean {
  let id = market.id + "-" + traderId;
  if (MarketParticipant.load(id) != null) return false;
  let marker = new MarketParticipant(id);
  marker.save();
  market.participants = market.participants + 1;
  return true;
}

/**
 * Counts a trader toward DailyStat.activeTraders exactly once per UTC day.
 * Returns true the first time this pair is seen.
 */
export function countActiveTrader(stat: DailyStat, traderId: string): boolean {
  let id = stat.id + "-" + traderId;
  if (DailyActiveTrader.load(id) != null) return false;
  let marker = new DailyActiveTrader(id);
  marker.save();
  stat.activeTraders = stat.activeTraders + 1;
  return true;
}

/**
 * Credits a win to the resolved winner and a loss to whoever sat opposite it.
 *
 * RingoResolved names the winner and nothing else, so the losing side has to
 * come from the fills themselves. Markets whose fill predates our start block
 * have no Ringo rows here: the winner still gets its win, and no loss is
 * invented for a trader we never saw. Losses are deduplicated per address, so
 * a market matched twice against the same opponent counts once.
 */
export function creditRecord(
  market: Market,
  winner: Address,
  timestamp: BigInt
): void {
  let winnerId = winner.toHexString();

  let champion = loadTrader(winner, timestamp);
  champion.wins = champion.wins + 1;
  champion.save();

  let fills = market.ringos.load();
  let credited: string[] = [];

  for (let i = 0; i < fills.length; i++) {
    let loserId = "";
    if (fills[i].userA == winnerId) {
      loserId = fills[i].userB;
    } else if (fills[i].userB == winnerId) {
      loserId = fills[i].userA;
    } else {
      continue;
    }

    if (credited.indexOf(loserId) >= 0) continue;
    credited.push(loserId);

    let loser = Trader.load(loserId);
    if (loser == null) continue;
    loser.losses = loser.losses + 1;
    loser.save();
  }
}

export function txBytes(event: ethereum.Event): Bytes {
  return event.transaction.hash;
}
