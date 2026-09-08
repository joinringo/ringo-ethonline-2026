# Decision log

Decisions taken during the hackathon, including the ones where we chose not to build something. Newest
first. Each entry records what was decided and why, so a reviewer does not have to reconstruct the
reasoning from the diff.

---

## Prize slot 3: World AgentKit vs Bazantic

**Status:** open. To be recorded here once decided.

Slot 3 is open between World AgentKit Continuity and Bazantic as a fallback. If AgentKit ends up
requiring a verified call from the platform's agent, that is a separate piece of backend work and
should be tracked separately rather than folded into the World ID gate.

Record the decision here when it is made, including which way and why.

---

## The subgraph indexes mainnet, not a test deployment

**Decided.** The subgraph points at the live RingoManager proxy on Polygon
(`0x6816374F4Bf692A8b317d9b03cF510DD81C40841`) from block `76393440`.

The alternative was indexing the Sepolia deployment, which would have been easier to control and would
have produced a demo with no real data in it. The mainnet contract has 8,771 creations and 9,654
resolutions, so the agent answers with figures a judge can independently verify on Polygonscan. The
cost is the seven-month event-shape gap documented in `ARCHITECTURE.md`, which we accepted rather than
decode a legacy ABI during a freeze week.

---

## World ID gates the credit, it does not replace login

**Decided.** Users still authenticate with their social account. Proof of personhood is required only
for the one action that costs money.

Making World ID the login would have been a bigger, more visible integration, and it would have been
the wrong product decision: it puts a hard identity requirement in front of every user for the benefit
of one feature, and it would have broken every existing session. Gating the credit alone is the
narrowest change that closes the sybil hole.

---

## The uniqueness guarantee lives in the database, not the application

**Decided.** A unique index on the nullifier is what enforces one-credit-per-human. The application
check is a fast path, not the fence.

An application-level "have we seen this nullifier?" query is subject to a race: two concurrent claims
both read "no", both proceed, both pay. A unique index cannot be raced. The platform additionally
verifies the index exists before granting, because the platform disables automatic index creation and
a declared-but-unbuilt index would enforce nothing while looking correct in code review.

---

## Nullifiers are canonicalized before storage

**Decided.** Strip leading zeros; reject zero and any non-decimal form.

Verified against a real database: `"123"` and `"0123"` are distinct keys under a unique index. Without
canonicalization the fence is defeatable once per leading zero added, up to the field width. This was
found by testing the database's actual behaviour rather than assuming it, and it is the kind of bug that
passes every unit test written against a mock.

---

## Both features ship behind flags that default off

**Decided.** `SUBGRAPH_ENABLED`, `SUBGRAPH_PRICE_HINT` and `WORLD_ID_GATE`, all strict-equality against
`"true"`.

Ringo is a live product with real money in it. A hackathon feature that cannot be switched off in one
environment variable is not shippable, regardless of how well it is tested. With the flags off, the
platform makes zero outbound requests to either service and its behaviour on the payment path is
byte-for-byte what it was before.

The corollary we accepted: the flags being off is the default, so the demo requires switching them on
deliberately in the staging environment rather than relying on them being on.

---

## The price hint never touches an order

**Decided.** The comparables line is appended to the agent's reply text and to its structured output.
It does not reach the order price, size or side.

The alternative, using the comparables rate to seed a suggested price, was rejected. The user's stated
odds are their own decision and the platform has an explicit rule that order pricing is never inferred.
Showing someone a base rate at the moment they commit is genuinely useful; quietly moving their price
toward it is not the same thing.

---

## No smart contract change

**Decided** at the outset and held. The subgraph indexes the deployed contract as it is.

Touching a live contract that custodies USDC during a hackathon week, to win a hackathon, is a bad
trade at any odds.
