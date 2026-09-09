# Pre-existing work and new work

Ringo has been a live product since September 2025: an AI agent on X that opens
real-money challenges under tweets, an order book, USDC settlement on Polygon
through the RingoManager contract, and a web app. That code is closed source, it
predates ETHOnline 2026 by a year, and **none of it is submitted for judging**.

This is a Continuity Track entry. The point of the track is that the new work
attaches to something that already exists, so the boundary has to be legible.
The table is that boundary.

## The dated boundary

The hackathon window is **4 a 13 September 2026**. Every commit in this
repository falls inside it; the first is 7 September 2026.

| Thing | Status | Evidence anyone can check |
|---|---|---|
| `RingoManager` on Polygon, `0x6816374F4Bf692A8b317d9b03cF510DD81C40841` | **Pre-existing.** Proxy created 2025-09-13T09:17:33Z at block 76393440, ten implementation upgrades since | On-chain. It is the `startBlock` in `subgraph/subgraph.yaml`, so the indexer's own history is the proof |
| The Ringo backend: order book, settlement, AI agent, credit ledger | **Pre-existing**, closed source | Not in this repository |
| The `app.joinringo.xyz` web app | **Pre-existing**, closed source | Not in this repository |
| `subgraph/` | **New.** 1,861 lines, 18 files | Whole commit history in this repo, from 2026-09-07 |
| `worldid-gate/` | **New.** 1,209 lines, 13 files, zero runtime dependencies, 37 tests | Whole commit history in this repo, `552ada2` onward |
| The Next.js stats app at the repository root | **New.** 4,612 lines, 43 files. Every figure is read from the subgraph, no database fallback | Whole commit history in this repo |
| `docs/` | **New.** 898 lines | This repository |
| `abi/RingoManager.json` | **New**, and reconstructed rather than copied: the private ABI never arrived and the implementation is unverified on every explorer, so it was rebuilt from mainnet bytecode and live logs | Method in `subgraph/README.md` |

## The thin wiring in the private repositories

Two changes were made outside this repository. They are named here because
hiding them would be the dishonest version of a Continuity entry, and because
the demo shows them.

- **Backend** (`ringo-backend`, private): registers a new `market_stats` agent
  tool that answers from the subgraph, adds a create-time price hint derived
  from comparable resolved markets, and checks the World ID gate before granting
  the welcome credit. All three sit behind feature flags that default off. The
  queries the tool uses are in [`../subgraph/docs/queries.md`](../subgraph/docs/queries.md);
  the gate contract it speaks is in [`INTEGRATION.md`](INTEGRATION.md).
- **Web app** (`ringo-webapp`, private): the user-facing claim flow, two
  same-origin API routes so the relying-party signing key never reaches a
  browser, and a `/welcome-credit` page. Behind `NEXT_PUBLIC_WORLDID_ENABLED`,
  off in production.

Neither is submitted for judging. Both are described in `INTEGRATION.md` in
enough detail to be reimplemented, and both are shown in the demo video.

## What is deliberately not claimed

- The subgraph is deployed to Subgraph Studio and synced to the chain head. It
  is **not** published to The Graph Network. The Graph's own prize text names
  Studio as a qualifying provider, so publishing would buy no eligibility and
  a freshly published subgraph would have to be picked up by an indexer and
  resynced before its gateway URL answered anything.
- The welcome credit itself is a pre-existing feature. What is new is the World
  ID gate in front of it: before this, one human with three accounts got three
  credits.
