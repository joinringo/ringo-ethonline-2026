# ringo-polygon subgraph

Indexes `RingoManager` on Polygon (markets, fills, resolutions) plus USDC
transfers into Ringo's fee addresses. Feeds the agent's `market_stats` tool,
the price suggestion in `create_ringo`, and the public stats page.

## Status

| Piece | State |
|---|---|
| `schema.graphql` | done |
| `subgraph.yaml` | done — address, start block, event signatures and `indexed` flags all settled against mainnet |
| `abis/RingoManager.json` | reconstructed from the chain, not downloaded — see below |
| `src/*.ts` | done — `graph codegen` and `graph build` both pass |
| `tests/*.ts` | written, **not executed** — matchstick ships no Windows binary and `graph test -d` needs Docker, which is not installed on this machine |
| Deploy | done — `0.0.2` in Studio, syncing from block 76393440 with no indexing errors |

## Where the ABI came from

The implementation behind the proxy is unverified on Polygonscan and absent
from Sourcify, and the private backend's `RingoManager.abi.ts` never arrived.
So the ABI in `abis/` was recovered from the chain, in two independent steps
that agree with each other.

**Types.** `keccak256(signature)` matches the `topic0` the contract emits, for
all four events. Each of those four constants also appears verbatim in the
implementation's runtime bytecode at
`0x3b9e0e3d0b8cdac44734e6397b0ca53ac716a15f`, which is how `RingoInvalidated`
was confirmed at all — it never fires inside the ~220k-block window public
Polygon RPCs still serve.

**`indexed`.** Read off the `LOG` opcode the compiler emits after each of those
constants: `LOG4`, `LOG3`, `LOG3`, `LOG2` — 3, 2, 2 and 1 indexed parameters.
For the three events that do fire, live logs agree to the byte: 4 topics + 96 B
of data, 3 + 0 B, 3 + 32 B.

Three of the four differed from the earlier guess. `questionId`, `userA`,
`userB` and the address on `RingoResolved` are all indexed, so deploying the
guess would have decoded every amount one word off — plausible numbers, all
wrong. That is the failure the old README warned about, and it was real.

## What the events actually mean

Two parameters meant something other than their placeholder name. Both were
settled by pairing events with their own transactions on mainnet.

**The sixth address on `RingoCreatedAndFilled` is a per-ringo escrow, not the
settlement token.** Every fill carries a different one, and each is an ERC-1167
minimal proxy cloned from `0x777758f0abbe3bd758c4f0a6650d24d347f6a818`. In fill
`0xf9726a30…b184` that address receives both 2.10 USDC stakes and forwards
0.021 to FeesManager.

**The `uint256` on `RingoResolved` is an amount, not an outcome code**, and the
address beside it is the winner, not an oracle. Across every resolution that
could be paired with its own fill, the amount equals `amountA + amountB` and
the address is one of the two traders, with both sides represented. It is the
gross pot rather than winnings: in `0x31cdbbcd…75bf` the event reads 2.000000
while the escrow pays the winner 1.900000.

## Run it

```bash
npm install
npm run codegen          # generates ./generated from the ABI + schema
npm run build            # compiles the mappings to wasm
npm test                 # matchstick (needs the binary; `graph test -d` uses Docker)

graph auth <DEPLOY_KEY>
npm run deploy           # graph deploy ringo-polygon
```

Deployed and syncing:

```
https://api.studio.thegraph.com/query/110471/ringo-polygon/<version>
```

That URL is what `SUBGRAPH_URL` in the root `.env.local` points at. A Studio
endpoint answers without an API key; the network gateway after `graph publish`
does not.

Watch the sync in Studio. A subgraph that deploys but reports a handler error
mid-sync will sit at a fraction of the chain head — check the status, not just
that the deploy returned a URL.

Publishing to the network (`npm run publish`) needs a wallet with a little ETH
on Arbitrum One for gas.

## Design notes

**Two data sources, one of them dangerous.** The USDC data source uses a
`topic2` filter so the node only ever calls the handler for transfers into the
two fee addresses. Without it, this subgraph indexes every USDC transfer on
Polygon and never finishes syncing before the deadline. `src/usdc.ts` re-checks
the address anyway, so a dropped filter degrades to slow rather than wrong.

**Distinct counts need marker entities.** `Market.participants` and
`DailyStat.activeTraders` are distinct counts, and a subgraph cannot compute
those at query time. `MarketParticipant` and `DailyActiveTrader` are presence
markers written once per pair; the counter increments only on first sight.

**`Trader.ringos` needs the `traders` array.** A derived field points at one
foreign key, and a trader sits on either side of a fill, so `userA` alone would
lose half the rows. Each `Ringo` carries `traders: [userA, userB]` and the
derived field hangs off that.

**Immutable where possible.** `Ringo`, `Resolution` and `FeeEvent` are
append-only and marked `immutable: true`, which is meaningfully faster to index
and to query. `Market`, `Trader` and `DailyStat` accumulate, so they are not.

**Entities are keyed on keccak256(ringoId), not ringoId.** The id is indexed on
a dynamic `bytes`, so the log carries only the hash, and the plaintext sits in
calldata that is always an ERC-4337 `handleOps` payload here — both traders are
smart accounts. Decoding `(bytes)` against that succeeds and returns a slice of
the UserOp array, which is how the first deploy ended up with a different id per
transaction and markets that never joined their fills. The topic hash is total,
collision-free and always present. Callers hash before querying.

**Fills without a market are kept.** If a fill arrives for a `questionId` we
never saw created, the mapping stubs the market rather than dropping the fill —
otherwise a start block set slightly too late silently understates lifetime
volume, which is the headline number in the demo.

**`Trader.wins` and `losses` are asymmetric, on purpose.** `RingoResolved`
names the winner, so wins are exact. Losses are inferred from the other side of
that market's fills, and a market whose fill predates the start block has no
fill row to read — so losses undercount where wins do not. The alternative,
dropping the column, throws away a number that is right most of the time.

**Fees count money coming in, never money moving around.** Both fee addresses
sit in the `topic2` filter and they also pay each other, so counting every
inbound transfer books the same fee twice. In resolution `0x31cdbbcd…75bf` the
escrow sends 0.09 USDC to FeesManager, which forwards 0.035 twice to the fee
recipient: 0.16 booked against a protocol fee of 0.09. `src/usdc.ts` drops any
transfer whose sender is itself a fee address.

## Reconciliation

Event counts Manuel read off Polygon mainnet on Sep 7, against the same events
as this subgraph indexed them. The subgraph was at block 93,413,359 when these
were taken; his last observed blocks are 93,334,340 to 93,355,333, so the
subgraph covers a slightly longer window and is expected to run a few events
ahead.

| Event | Mainnet, Sep 7 | Subgraph | Gap | Why |
|---|---|---|---|---|
| `RingoCreatedAndFilled` | 8,771 | 8,779 `Ringo` | +8 | fills landed after his count |
| `RingoResolved` | 9,654 | 9,660 `Resolution` | +6 | same |
| `QuestionCreated` | 4,763 | 4,771 markets with a `questionId` | +8 | same |
| `RingoInvalidated` | 628 | 595 markets with status `INVALID` | −33 | not one-to-one, see below |

Three of the four line up to the event, and the drift is in the direction and
of the size a longer window predicts.

The fourth is not a discrepancy but a different unit. `INVALID` is a status on
a market, not a count of events: 628 invalidations resolve onto 595 distinct
markets, and a market that is invalidated and later resolved keeps whichever
status arrived last. Counting invalidation events themselves would need an
entity per event, which nothing queries.

**1,227 markets carry no fill**, out of 10,006. Those are the v1 era: the
creation event before block 85629763 has a different signature and is not
decoded here, so a market that only ever resolved gets stubbed with zero volume
rather than dropped. Manuel counted 2,453 of those v1 creations; the 1,227 here
are the subset that went on to resolve or be invalidated inside the indexed
window. Dropping them instead would have hidden a fifth of all settlements.

Fees are not reconciled against kpi.joinringo.xyz yet. The subgraph reports
19,426 `FeeEvent` rows and a fee take that reads around 8.5% of settled volume
on the days that carry both, which is well above what a single settlement shows
on chain — 0.09 USDC on a 2.00 pot, 0.021 on a 4.20 fill. That gap is open and
is the one number in this README that should not be quoted at a judge without
it.
