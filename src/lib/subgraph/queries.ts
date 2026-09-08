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
      claim
      claimHeld
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
      ringos(first: 1) {
        amountA
        amountB
        userA {
          id
        }
        userB {
          id
        }
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
   * The claim in the words whoever opened it wrote. Read from the ringo
   * contract, not from a log — RingoManager takes it as calldata and emits
   * nothing carrying it. Null where the call reverted or no fill was indexed.
   */
  claim: string | null;
  /**
   * Whether the claim turned out to be true. The contract fixes userA as the
   * YES side, so the winning address settles it. Null while open, for a voided
   * market, and where the fill predates the index.
   *
   * Only asking for it against a deployment that has it: an unknown field
   * fails the whole query, so it takes the page down rather than the column.
   * That is what `Type \`Market\` has no field \`claimHeld\`` was.
   */
  claimHeld: boolean | null;
  /**
   * Null more often than age explains: the contract keys a question by
   * keccak256(claim) and only emits QuestionCreated the first time a claim is
   * seen, so repeats reuse the question silently.
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
  /**
   * The market's fill. A list because `ringos` is a derived field, but never
   * more than one entry: markets are keyed per ringo, so a market holds exactly
   * one matched pair. Empty for the v1-era markets that were stubbed from a
   * resolution with no creation we decode.
   */
  ringos: {
    amountA: string;
    amountB: string;
    userA: { id: string };
    userB: { id: string };
  }[];
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

/**
 * Every resolved market's verdict, and nothing else.
 *
 * A subgraph has no COUNT, so a share has to be folded from rows.
 *
 * Paged on `id_gt` rather than on `skip`, which a subgraph caps at 5000 — the
 * sixth page of this query is already past it. A cursor has no ceiling, and it
 * cannot skip or repeat a row when the set grows between pages the way an
 * offset can. `id` is the cursor because it is unique; `createdAt` ties.
 */
export const CLAIM_VERDICTS_QUERY = /* GraphQL */ `
  query ClaimVerdicts($first: Int = 1000, $after: ID = "") {
    markets(
      first: $first
      where: { status: RESOLVED, id_gt: $after }
      orderBy: id
      orderDirection: asc
    ) {
      id
      claimHeld
    }
  }
`;

export type ClaimVerdictsResponse = {
  markets: { id: string; claimHeld: boolean | null }[];
};
