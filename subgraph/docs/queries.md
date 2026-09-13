# Query contracts for the Graph integration

Reviewed against the platform client on September 13, 2026. The Studio endpoint
is public and requires no API key:

```text
POST https://api.studio.thegraph.com/query/110471/ringo-polygon/version/latest
Content-Type: application/json
```

The backend client lives in a private repository. The query contracts below
make its data dependencies inspectable without claiming that its full source
is included here.

## Stats for an indexed position

```graphql
query MarketStats($where: Market_filter!) {
  markets(where: $where, first: 1) {
    id
    questionId
    claim
    category
    status
    claimHeld
    volume
    fills
    participants
  }
}
```

Pass `{ "where": { "id": "<keccak256 of raw ringoId bytes>" } }`. The platform
uses `questionId` only as a fallback when it lacks that hash. An empty result
means unavailable data, not a zero-valued position.

Despite its name, an indexed `Market` row represents one on-chain ringo/position,
not the complete platform challenge across all positions. `volume` is raw
six-decimal USDC; divide by 1e6. `claimHeld` is the Boolean verdict; `outcome`
is an amount and must not be rendered as YES/NO. An undecided verdict is null.

## Comparable resolved claims

```graphql
query ComparableOutcomes($clauses: [Market_filter!]!, $first: Int!) {
  markets(
    where: { or: $clauses }
    orderBy: resolvedAt
    orderDirection: desc
    first: $first
  ) {
    claim
    claimHeld
  }
}
```

Example variables:

```json
{
  "clauses": [
    { "status": "RESOLVED", "claim_contains_nocase": "bitcoin" },
    { "status": "RESOLVED", "claim_contains_nocase": "btc" }
  ],
  "first": 500
}
```

The caller derives subject aliases from the proposed claim. It retains Boolean
verdicts, reapplies whole-word subject matching because the server filter is a
substring search, and deduplicates by normalized claim (trimmed, lowercased,
internal whitespace collapsed). It then divides distinct YES claims by all
distinct decided claims in the returned sample. This is a bounded historical
sample, not a prediction or an exhaustive count of every matching challenge.
The UI omits the hint when relevant data is unavailable.

`status` belongs inside each `or` clause. `tags` cannot drive this query because
the contract does not emit them. The earlier tag-based proposal in historical
documents was replaced before the recorded demo.

## Recently active traders, ranked by lifetime volume

```graphql
query TopTraders($since: BigInt!, $exclude: Bytes!) {
  traders(
    where: { lastActive_gte: $since, id_not: $exclude }
    orderBy: volume
    orderDirection: desc
    first: 5
  ) {
    id
    volume
    wins
    losses
  }
}
```

`since` is a Unix timestamp in seconds. The caller excludes Ringo's operations
wallet. The time filter selects recently active traders; `volume`, `wins` and
`losses` remain lifetime figures. This query does not compute seven-day volume.
Amounts still use six-decimal USDC base units.

## Index health

```graphql
query IndexHealth {
  _meta {
    block { number }
    hasIndexingErrors
  }
}
```

Check for GraphQL `errors` even when HTTP is 200. An unavailable index should
produce an unavailable-data state, never invented totals. The stats app's
queries live in `src/lib/subgraph/`; daily distinct trader counts must not be
summed across days to claim an all-time distinct count.
