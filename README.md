# Ringo at ETHOnline 2026

**Ringo is a prediction market that lives inside social feeds.** You reply to a tweet with
`@joinringo $5 YES BTC hits 100k by December` and a real, on-chain, USDC-settled market is created and
filled for you. No app to download, no order book to learn.

For ETHOnline 2026 we made the agent behind that reply *know things*, and we made its free credit
provably one-per-person.

- **Live on Polygon mainnet since September 2025.** 8,771 markets created and filled, 9,654 resolved,
  4,763 questions posted on-chain. This is not a hackathon deployment.
- **Track:** Continuity.

---

## What we built during the hackathon

Two features, each behind a feature flag so the production platform was never at risk.

### 1. The agent answers from The Graph

Before: ask the bot "how much has traded on this?" and it had no source. It could create markets and
join them, but it could not reason about them.

Now the agent has a `market_stats` tool backed by our own subgraph, and it uses that data in two
different ways:

**As a natural-language interface.** Reply "how much has traded on this?" under a market and the bot
answers with the real figures:

> `$1,234.50 traded on this one, 7 fills, 4 participants in. Similar BTC markets hit YES 67% of the time.`

**As a decision input.** When you create a market, the agent queries resolved markets that share the
new market's tags and, if there are at least five, appends a line to its reply:

> `Similar markets resolved YES 67% of the time (12 markets).`

That second one is the part we care about. It is not a stat readout, it is the subgraph shaping what
the agent tells a person at the moment they are committing money. The order price, size and side are
never touched by it: the hint is text, and the boundary is enforced by tests.

### 2. One free credit per human, not per account

Ringo gives new users a small credit to place their first prediction. It was idempotent per **account**,
which on X means one person with five handles could collect it five times. That is the oldest sybil
problem in social products and we had it.

Now the credit requires a verified World ID nullifier, and a unique database index on that nullifier is
what enforces one-per-human. Claim from a second account with the same nullifier and you get
`already_claimed`, not a second credit.

World ID is used here as an **abuse-prevention and eligibility signal**, not as a login. You still sign
in with your social account; proof of personhood only gates the thing that costs us money.

---

## How the sponsor technology is actually load-bearing

### The Graph

The subgraph is not a read-only dashboard bolted on the side. It is the only source for two agent
behaviours that did not exist before, and if it goes down the agent loses them (it degrades to
"stats are unavailable right now" rather than inventing numbers).

Three queries, all in [`docs/queries.md`](docs/queries.md):

| Query | What the agent does with it |
|---|---|
| `marketStats(questionId)` | Answers volume, fills and participant questions in natural language |
| `comparableOutcomes(tags)` | Computes a YES rate across resolved markets sharing a tag, then puts it in front of a user at market creation |
| `topTraders(since)` | Answers "who is winning" without exposing wallet addresses |

The indexed contract is the **live mainnet RingoManager proxy**, not a test deployment. Address, exact
start block and the two mapping traps we hit are documented in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### World

The nullifier is the eligibility key for a real payment. Concretely:

- The gate **fails closed**. An unreachable verifier, a timeout, a non-200, a redirect, or a body whose
  `verified` field is anything other than the literal boolean `true` all mean "not verified" and grant
  nothing. A gate that fails open is decoration.
- Nullifiers are **canonicalized** before they are stored, because `"123"` and `"0123"` are different
  keys in a unique index. Without that, adding a leading zero would defeat the whole mechanism once per
  zero. We found this by testing against a real database, not by reading docs.
- The guarantee is enforced by a **database uniqueness constraint**, not an application check. The
  service additionally refuses to grant if it cannot see that the index exists, so a misconfigured
  deployment fails closed instead of silently paying everyone.

---

## Repository layout

This is a monorepo. The Ringo platform itself is a separate, private codebase; what lives here is
everything built for the hackathon plus the contracts between the two.

```
packages/subgraph/       ringo-polygon: the subgraph indexing RingoManager on Polygon mainnet
packages/dashboard/      a UI over the subgraph data, the part a judge can click through
packages/worldid-gate/   standalone service that verifies an IDKit proof and records the nullifier
packages/frontend/       the claim flow a user completes to prove personhood and receive the credit
docs/                    architecture, the three queries, integration contracts, decision log
```

Each package has its own README with setup instructions.

## Documentation

| Document | What is in it |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How the pieces fit, the mainnet data source, and the two subgraph traps |
| [`docs/queries.md`](docs/queries.md) | The three GraphQL queries the agent sends, verbatim |
| [`docs/INTEGRATION.md`](docs/INTEGRATION.md) | The HTTP contracts between the gate, the frontend and the platform |
| [`docs/decisions.md`](docs/decisions.md) | Decision log, including what we chose not to build |

## Honest scope

Things we would rather state than have a judge discover:

- **The one-per-human guarantee is prospective.** Anyone who received the credit before the gate was
  switched on has no nullifier on record, and we cannot backfill one because none was ever collected.
  The mechanism is sound; the history is not retroactive.
- **Both features ship behind flags that default off.** With the flags off, the platform behaves exactly
  as it did before and makes zero outbound requests to either service. That was a hard requirement: this
  is a live product with real money in it, not a demo.
- **No smart contract was changed.** The subgraph indexes the existing mainnet contract as-is.

## License

MIT. See [LICENSE](LICENSE).
