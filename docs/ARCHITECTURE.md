# Architecture

## The shape of the system

Ringo's platform is a private NestJS monorepo. Everything in this repository is either new work built
for the hackathon or the contract between that work and the platform. Nothing here needs access to the
platform's source to be developed or run.

```
                    a person replies to a tweet
                              |
                     Ringo agent (private)
                       /              \
        market_stats tool          create_ringo tool
                  |                       |
                  |                 price hint line
                  v                       v
          +-----------------------------------+
          |   subgraph: ringo-polygon         |   packages/subgraph
          |   indexes RingoManager on Polygon |
          +-----------------------------------+
                              ^
                              | indexes
                     RingoManager proxy (mainnet)


        a person claims the welcome credit
                    |
          claim flow (packages/frontend)
                    |
            IDKit proof + nullifier
                    |
        +---------------------------+
        |  worldid-gate service     |          packages/worldid-gate
        |  POST /verify             |  <- frontend calls this
        |  GET  /status?nullifier=  |  <- platform calls this, and only this
        +---------------------------+
                    |
        POST /welcome-bonus/claim (platform)
                    |
        unique index on nullifier -> one credit per human
```

Two things worth noting about the boundaries:

- **The platform calls the gate for exactly one thing.** `GET /status?nullifier=` returning
  `{ "verified": boolean }`. Proof verification happens entirely in the gate; the platform never sees a
  proof and has no World ID dependency of its own.
- **The agent never writes to the subgraph.** It is a read-only data source. Every helper returns
  `null` on any failure, and the tools degrade to "stats are unavailable right now" rather than
  fabricating numbers.

## The data source: mainnet, verified

The subgraph indexes the **live** RingoManager proxy on Polygon mainnet. These values were read directly
from chain and cross-checked against the deployed platform configuration.

| | |
|---|---|
| Network | Polygon mainnet, chain id `137` |
| Contract | `0x6816374F4Bf692A8b317d9b03cF510DD81C40841` |
| Kind | EIP-1967 proxy, UUPS (admin slot is zero) |
| Current implementation | `0x3B9e0e3d0B8cDAc44734E6397B0ca53aC716A15f` |
| `startBlock` | `76393440` |
| Deployed | 2025-09-13T09:17:33Z |
| Creation tx | `0xd595feaff30f464b036c299d864394dd3763f1a0f1ea9d3dfdc8f8107b5cbf07` |

There is a second RingoManager address in circulation,
`0xac2b7d6e98b3CC643ea0fE4E93e3864f9c426417`. **It has no code on Polygon.** It is the Sepolia
deployment, and it is the default value in the platform's example environment file, which makes it the
easiest wrong answer to pick up. Verify with `eth_getCode` before trusting either.

### Event signatures

| Event | topic0 |
|---|---|
| `RingoCreatedAndFilled(bytes,address,address,uint256,uint256,address)` | `0x54a799307400e6f08c7e9257a13e3ad04fbeb83d61a9fe4c97f2051a00b3a728` |
| `RingoResolved(bytes,address,uint256)` | `0xfdc112976f8d35d47021e6fe9f453bb6354c983052294240286e489d9f38d006` |
| `RingoInvalidated(bytes,uint256)` | `0x42e8dbfd26de9421ff1a966571e1ead4a6b4ead37faaf2da695c0ec21a972bab` |
| `QuestionCreated(bytes,bytes32)` | `0xbb208997f99f1204f3fafd404bfe4243d1d91ca880b0b4306e60c3edcfe3fcb6` |

## Two traps in the mapping

Both of these cost real time to find. They are documented here so nobody has to find them twice.

### `ringoId` is not recoverable from the log

In all four events, `ringoId` is declared `indexed` on a dynamic `bytes` type. Per the Solidity ABI
spec, an indexed dynamic type is stored in the topic as `keccak256(value)`, never as the value. So:

```ts
event.params.ringoId.toHex()   // a hash. Looks like an id. Joins to nothing.
```

The mapping must recover the id from somewhere the raw bytes survive. The direct route is the calling
transaction's calldata, since function inputs are never hashed:

```
createAndFillRingo(bytes _ringoId, ...)
resolveRingo(bytes _ringoId)
```

available in a handler as `ethereum.Transaction.input`. A hash-to-id registry populated at creation
time also works, but requires every consumer to hash forward.

### Creation events start seven months after `startBlock`

The proxy has been upgraded ten times since deployment, and the v1 implementation emitted a
differently-shaped creation event. Concretely:

- Legacy creation event, topic0 `0x3e23a2fa082d3985cedf3d59896763b90d0ce60cc8fd0f4df9850e6cab1eeb09`,
  2,453 occurrences, blocks `76394967` to `85612041`.
- Current `RingoCreatedAndFilled` shape begins at block `85629763` (2026-04-16).

`RingoResolved` and `RingoInvalidated` never changed signature across any of the ten upgrades, so those
two are consistent across the entire history.

The practical consequence: indexing from `76393440` with the current ABI yields resolutions and
invalidations for the full history and creations from April 2026 onward. The gap is expected and is not
an indexing bug.

### Volume on chain, for reference

| Event | Count | First block | Last block |
|---|---|---|---|
| `RingoCreatedAndFilled` | 8,771 | `85629763` | `93334340` |
| `RingoResolved` | 9,654 | `76469033` | `93355333` |
| `RingoInvalidated` | 628 | `76533198` | `93257716` |
| `QuestionCreated` | 4,763 | `85629763` | `93334340` |

## Failure behaviour, by design

| Component | On failure |
|---|---|
| Subgraph unreachable, slow, or returning GraphQL errors | Every client helper returns `null`. The stats tool answers "stats are unavailable right now". The price hint is silently absent. Market creation is never delayed beyond the configured timeout and never fails because of it. |
| Gate unreachable, timing out, or returning anything but `{ "verified": true }` | Treated as not verified. No credit is granted. Fails closed. |
| Uniqueness index missing on the nullifier | The platform refuses to grant while the gate is enabled, rather than silently paying every account of one person. |

The last row is the one that matters most. The platform sets `autoIndex: false` on every database
connection, so declaring a unique index in a schema builds nothing at all: the index has to be created
by an explicit migration. A gate whose uniqueness constraint does not exist would report success on
every claim while enforcing nothing, and every automated test would still pass. Verifying the
constraint at the point of payment is the only way that failure becomes visible.
