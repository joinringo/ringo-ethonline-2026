import "server-only";
import { querySubgraph } from "./client";
import {
  LIFETIME_QUERY,
  TOP_MARKETS_QUERY,
  TOP_TRADERS_QUERY,
  type LifetimeResponse,
  type Market,
  type TopMarketsResponse,
  type TopTradersResponse,
  type Trader,
} from "./queries";

export type LifetimeTotals = {
  volume: bigint;
  fees: bigint;
  fills: number;
  days: number;
  /**
   * Fees from the days that also carry volume, and how many of those there are.
   *
   * Dividing lifetime fees by lifetime volume looks obvious and is wrong here:
   * fees are indexed from the start block, while volume only exists from the
   * block the current fill event starts firing at. Most indexed days have fees
   * and no volume at all, so the naive ratio reports a fee rate several times
   * the real one. These two fields exist so the page can divide like against
   * like.
   */
  feesOnVolumeDays: bigint;
  volumeDays: number;
  /** Distinct traders on the most recent day that has any activity. */
  activeTradersToday: number;
  /** Midnight UTC of that most recent day, or null when nothing is indexed. */
  lastActiveDay: string | null;
};

/** One bar of the activity chart. Zero-volume days are real days, not gaps. */
export type DailyPoint = {
  /** Midnight UTC, unix seconds, as a string. */
  date: string;
  volume: bigint;
  fills: number;
  activeTraders: number;
};

export type StatsPageData = {
  totals: LifetimeTotals;
  series: DailyPoint[];
  markets: Market[];
  traders: Trader[];
  /**
   * What was asked for, echoed back so a caller can tell a full page from a
   * short one. A list shorter than its limit is the end of the data, and that
   * is the only end signal available: a subgraph has no total count at query
   * time, and counting would mean pulling every row to throw it away.
   */
  limits: StatsLimits;
};

export type StatsLimits = {
  markets: number;
  traders: number;
};

/** What the page asks for before anyone clicks anything. */
export const DEFAULT_LIMITS: StatsLimits = { markets: 8, traders: 8 };

/**
 * The subgraph caps `first` at 1000, but that is not the limit worth respecting
 * here: every row is server-rendered HTML with no client pagination behind it,
 * so an enormous page hurts the reader before it costs the index anything.
 */
export const MAX_LIMIT = 200;

/** How many more rows one "show more" asks for. */
export const PAGE_STEP = 20;

/**
 * Reads a row limit out of a URL search param, refusing anything that is not a
 * plain positive integer.
 *
 * Query strings are untrusted input and this one is forwarded straight into a
 * GraphQL variable. Without the guard, `?markets=1e9` reaches the subgraph as
 * a value it rejects, and an error page replaces a page that should simply
 * have ignored a bad number.
 */
export function parseLimit(
  raw: string | string[] | undefined,
  fallback: number
): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) return fallback;
  if (!/^[0-9]+$/.test(value)) return fallback;
  const parsed = Number(value);
  if (parsed < 1) return fallback;
  return Math.min(parsed, MAX_LIMIT);
}

const DAY_SECONDS = 86_400;
const CHART_DAYS = 30;

function foldLifetime(days: LifetimeResponse["dailyStats"]): LifetimeTotals {
  let volume = 0n;
  let fees = 0n;
  let fills = 0;
  let feesOnVolumeDays = 0n;
  let volumeDays = 0;

  for (const day of days) {
    const dayVolume = BigInt(day.volume);
    const dayFees = BigInt(day.fees);

    volume += dayVolume;
    fees += dayFees;
    fills += day.fills;

    if (dayVolume > 0n) {
      feesOnVolumeDays += dayFees;
      volumeDays += 1;
    }
  }

  // activeTraders is a daily distinct count. Summing it across days would count
  // a trader once per day they showed up, which is a different and much larger
  // number than "how many people trade on Ringo".
  const mostRecent = days[0];

  return {
    volume,
    fees,
    fills,
    days: days.length,
    feesOnVolumeDays,
    volumeDays,
    activeTradersToday: mostRecent ? mostRecent.activeTraders : 0,
    lastActiveDay: mostRecent ? mostRecent.date : null,
  };
}

/**
 * The subgraph only writes a DailyStat for days that had activity, so the rows
 * come back with holes in them. Plotting them side by side would compress a
 * quiet week into one bar and make the x axis lie about time. This walks a
 * fixed 30-day window backwards from the last indexed day and fills the
 * missing days with zeros.
 *
 * The window ends on the last day the index saw, not on today: if the subgraph
 * is a day behind, an empty trailing bar would read as "nobody traded".
 */
function buildSeries(days: LifetimeResponse["dailyStats"]): DailyPoint[] {
  const newest = days[0];
  if (!newest) return [];

  const byDate = new Map(days.map((day) => [day.date, day]));
  const lastDay = Number(newest.date);
  const points: DailyPoint[] = [];

  for (let offset = CHART_DAYS - 1; offset >= 0; offset -= 1) {
    const date = String(lastDay - offset * DAY_SECONDS);
    const row = byDate.get(date);
    points.push({
      date,
      volume: row ? BigInt(row.volume) : 0n,
      fills: row ? row.fills : 0,
      activeTraders: row ? row.activeTraders : 0,
    });
  }

  return points;
}

export async function getStatsPageData(
  limits: StatsLimits = DEFAULT_LIMITS
): Promise<StatsPageData> {
  // The lifetime fold and the chart always read every day. Asking for more
  // table rows must not move the headline figures.
  const [lifetime, topMarkets, topTraders] = await Promise.all([
    querySubgraph<LifetimeResponse>(LIFETIME_QUERY, { first: 1000 }),
    querySubgraph<TopMarketsResponse>(TOP_MARKETS_QUERY, {
      first: limits.markets,
    }),
    querySubgraph<TopTradersResponse>(TOP_TRADERS_QUERY, {
      first: limits.traders,
    }),
  ]);

  return {
    totals: foldLifetime(lifetime.dailyStats),
    series: buildSeries(lifetime.dailyStats),
    markets: topMarkets.markets,
    traders: topTraders.traders,
    limits,
  };
}
