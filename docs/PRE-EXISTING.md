# Pre-existing work and new work

Ringo is a live product since 2025: an AI agent on X that opens real-money
challenges under tweets, an order book, USDC settlement on Polygon
through the RingoManager contract, and a web app. That code is closed source
and predates ETHOnline 2026; none of it is submitted for judging.

Built during ETHOnline 2026 (September 4–13), all in this repository with full
commit history:

- `subgraph/` — the first indexer of Ringo's contracts on Polygon, deployed to
  Subgraph Studio and synced to the chain head. Not yet published to The Graph
  Network; queries still go to the Studio endpoint.
- `worldid-gate/` — World ID verification in front of the welcome credit, with
  a nullifier store. Zero runtime dependencies, 31 tests, fails closed on every
  path. The user-facing claim flow is separate and is called out below.
- the Next.js app at the repository root — every figure it shows is read from
  the subgraph, with no database fallback.
- `subgraph/docs/queries.md` — the subgraph queries the agent's new
  `market_stats` tool uses; the tool and the price suggestion live in the
  private backend and are shown in the demo video at 0:50 and 1:10.
- [slot 3]

The private repositories received thin wiring commits: the backend registers
the new agent tool and checks the gate behind a feature flag, and the
app.joinringo.xyz frontend carries the claim flow described in
[`../worldid-gate/README.md`](../worldid-gate/README.md) and
[`INTEGRATION.md`](INTEGRATION.md). Both are described here and shown in the
video.

[TODO: Facu] Add the dated table of pre-existing vs new before submitting.
