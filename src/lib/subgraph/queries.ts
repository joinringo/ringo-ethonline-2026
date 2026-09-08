/**
 * The queries this app sends, kept next to the types they return so a schema
 * change breaks the build rather than the page.
 *
 * These mirror subgraph/docs/queries.md. If you change one, change both.
 */

export const LIFETIME_QUERY = /* GraphQL */ `
  query Lifetime($first: Int = 1000) {
    dailyStats(orderBy: date, orderDirection: desc, first: $first) {
      id
      date
      volume
      fills
      fees
      activeTraders
    }
  }
`;

export const TOP_MARKETS_QUERY = /* GraphQL */ `
  query TopMarkets($first: Int = 8) {
    markets(orderBy: volume, orderDirection: desc, first: $first) {
      id
      questionId
      status
      outcome
      volume
      fills
      participants
      createdAt
      resolvedAt
      resolution {
        resolver
      }
    }
  }
`;

export const TOP_TRADERS_QUERY = /* GraphQL */ `
  query TopTraders($first: Int = 8) {
    traders(orderBy: volume, orderDirection: desc, first: $first) {
      id
      volume
      wins
      losses
      lastActive
    }
  }
`;

export type DailyStat = {
  id: string;
  date: string;
  volume: string;
  fills: number;
  fees: string;
  activeTraders: number;
};

export type MarketStatus = "OPEN" | "RESOLVED" | "INVALID";

export type Market = {
  /**
   * keccak256(ringoId) as hex, which is what the chain exposes: the contract
   * indexes ringoId on a dynamic `bytes`, so the log carries only its hash.
   * Not a human-readable title — see the note below.
   */
  id: string;
  /**
   * Null for markets created before block 85629763, when QuestionCreated
   * started firing.
   */
  questionId: string | null;
  status: MarketStatus;
  /**
   * MISNAMED in the schema, knowingly: the resolution event's uint256 is an
   * amount in raw USDC units, not an outcome code. It is the gross pot —
   * amountA + amountB of the fill — so it says how big the settled market was,
   * never which side won. Null while the market is open.
   *
   * Not rendered, on purpose: entities are keyed per ringo, so a market holds
   * exactly one fill and this always equals `volume`. A column repeating the
   * one beside it is noise. The winner below is the figure the resolution
   * actually adds.
   */
  outcome: string | null;
  volume: string;
  fills: number;
  participants: number;
  createdAt: string;
  resolvedAt: string | null;
  /**
   * The winning address sits on the resolution, not on the market. Null while
   * the market is open, and also for a resolution the subgraph indexed before
   * its own creation event — see the schema note on Market.winner.
   */
  resolution: { resolver: string | null } | null;
};

export type Trader = {
  id: string;
  volume: string;
  wins: number;
  losses: number;
  lastActive: string;
};

export type LifetimeResponse = { dailyStats: DailyStat[] };
export type TopMarketsResponse = { markets: Market[] };
export type TopTradersResponse = { traders: Trader[] };
