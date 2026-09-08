# The three queries the agent sends

These are the exact documents the Ringo agent sends to the subgraph. They are reproduced verbatim from
the client implementation so the subgraph schema can be checked against them: a shape mismatch fails
GraphQL validation and returns `null`, which is indistinguishable from "no data" at the call site.

The client sends them over HTTP POST with `Authorization: Bearer ${SUBGRAPH_API_KEY}` when a key is
configured, a configurable timeout (5s default), one retry on a network error and **no** retry on a
GraphQL error. Responses are cached in memory, keyed by document plus variables, for 30 seconds.

## 1. `marketStats`

Answers "how much has traded on this?" for one market, keyed by its on-chain `questionId`.

```graphql
query MarketStats($questionId: String!) {
  markets(where: { questionId: $questionId }, first: 1) {
    id
    questionId
    claim
    category
    tags
    status
    outcome
    volume
    fills
    participants
  }
}
```

Note the market is looked up by **`questionId`, not by our internal market id**. A Ringo market has no
`questionId` until it has been created on-chain, so a market that exists in our database but not yet on
chain cannot be found here. That is expected, and the agent falls back to the comparables block.

## 2. `comparableOutcomes`

Resolved markets that share at least one tag with a given market. The client reduces the result to a
count and a YES rate; the subgraph does not compute the rate.

```graphql
query ComparableOutcomes($tagClauses: [Market_filter!], $first: Int!) {
  markets(
    where: { status: RESOLVED, or: $tagClauses }
    orderBy: resolvedAt
    orderDirection: desc
    first: $first
  ) {
    claim
    outcome
    volume
  }
}
```

`$tagClauses` is one `{ tags_contains: [tag] }` object per tag, capped at five tags:

```json
{
  "tagClauses": [{ "tags_contains": ["crypto"] }, { "tags_contains": ["btc"] }],
  "first": 50
}
```

Two deliberate choices here:

- **`or` over per-tag `tags_contains`.** `tags_contains` on an array field means "contains all of", so
  it cannot express "shares at least one tag" on its own. The `or` wrapper is the only way to say that.
- **`orderBy: resolvedAt, orderDirection: desc`.** Without an explicit order, `first: 50` returns the
  fifty lowest entity ids, which is an arbitrary and permanently frozen slice rather than a sample. Once
  a tag exceeds fifty resolved markets, an unordered query would stop responding to new resolutions
  entirely while still reporting "50 markets" to the user.

The client then keeps only markets whose outcome is `YES` or `NO`. `INVALID` markets are excluded from
both the numerator and the denominator, because a YES rate over undecided markets is not a rate.

## 3. `topTraders`

```graphql
query TopTraders($since: BigInt!) {
  traders(
    where: { lastActive_gte: $since }
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

`$since` is a Unix timestamp in seconds, sent as a string. The client rounds it down to a
cache-TTL-sized bucket before sending, so a rolling window like "the last 7 days" does not produce a
unique cache key on every call and bill a fresh query per request.

Wallet addresses come back as the entity `id`. The agent shortens them to first six plus last four
characters for its structured output and **never** puts an address into the sentence it hands the
language model, because published replies must not contain wallet addresses.

## Schema expectations

The queries above assume:

| Field | Expected type | If it differs |
|---|---|---|
| `Market.questionId` | `String` | A `Bytes` type makes query 1 fail validation and return null silently |
| `Market.status` | enum including `RESOLVED` | A `String` type makes query 2 fail validation |
| `Market.outcome` | enum or string, `YES` / `NO` / `INVALID` | Compared case-insensitively by the client |
| `Market.tags` | `[String]` | Required for query 2 to work at all |
| `Market.volume`, `Trader.volume` | see below | |
| `Trader.lastActive` | `BigInt` timestamp in seconds | |

### The units question

`volume` is rendered directly as a dollar figure by the agent. The client assumes it arrives already
denominated in **whole USDC**.

If the mapping stores the raw on-chain value instead, USDC is a 6-decimal token, so every figure the
agent publishes would be a million times too large: a $15 market announced as `$15,000,000.00`. The
conversion is single-sourced in one function on the client (`subgraphVolumeToUsd`) precisely so this is
a one-line correction in either direction.
