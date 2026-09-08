# ringo-polygon

The subgraph indexing `RingoManager` on Polygon mainnet. This is the data source behind the agent's
`market_stats` tool and its create-time comparables hint.

## Where the code goes

This directory holds the subgraph project: `subgraph.yaml`, `schema.graphql`, the `abis/` it needs and
the `src/` mappings.

## Data source

Full detail, including the two mapping traps, is in [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md).
The short version:

```yaml
network: matic
address: "0x6816374F4Bf692A8b317d9b03cF510DD81C40841"
startBlock: 76393440
```

Do not use `0xac2b7d6e98b3CC643ea0fE4E93e3864f9c426417`. It has no code on Polygon; it is the Sepolia
deployment and it is the default in the platform's example env file.

## Before you write the mappings, read this

`ringoId` is declared `indexed` on a dynamic `bytes` type in all four lifecycle events, so the log topic
holds `keccak256(ringoId)` and not the value. `event.params.ringoId.toHex()` returns a hash that looks
like a valid id and joins to nothing. Recover it from the transaction calldata via
`ethereum.Transaction.input` instead.

## The schema has to satisfy three queries

They are specified verbatim in [`../../docs/queries.md`](../../docs/queries.md), along with the exact
field types they assume. A type mismatch fails GraphQL validation and returns `null`, which at the call
site is indistinguishable from "no data" and will look like an empty subgraph.

One open question flagged in that document: whether `volume` is denominated in whole USDC or in raw
6-decimal base units. The agent renders it directly as a dollar figure, so this needs to be settled
before the first end-to-end run.

## Commands

```bash
npm install
npm run codegen
npm run build
npm run deploy        # Subgraph Studio
```

## What the platform needs from this package

- `SUBGRAPH_URL`: the Studio query URL, then the gateway URL after publishing
- `SUBGRAPH_API_KEY`: goes into the platform's secrets store, never a plain env var
