# Reply to Manuel — Sep 7, after the deploy

The subgraph is live and synced to the chain head. This answers your blocking
questions with measured values, and corrects two things in your doc that would
cost a day each if you build on them.

**The two corrections first, because they change what you do:** the ringoId
cannot be recovered from calldata on this contract (§05a), and query #2 does not
compile (§06).

---

## §02 The three values

| | |
|---|---|
| `SUBGRAPH_URL` | `https://api.studio.thegraph.com/query/110471/ringo-polygon/0.1.0` |
| `SUBGRAPH_API_KEY` | **None needed.** Leave it empty |
| `WORLDID_GATE_URL` | Still pending — the gate is not built |

On the API key: a Studio query endpoint takes no authentication. I checked that
against the server rather than the docs — same `200`, identical response body,
with and without an `Authorization` header. Do not put the deploy key there:
that credential authorises *deploying code* to the subgraph, and it would be
sent on every request to a service that ignores it. A real query key only starts
mattering once we `graph publish` and queries move to the gateway.

Two of three unblock you now.

---

## §03a `volume` is raw, 6 decimals — confirmed against the deployed index

Every USDC field holds the raw on-chain integer: `Market.volume`,
`Trader.volume`, `DailyStat.volume`, `DailyStat.fees`, and the `outcome` amount.

A live row from the endpoint above, a two-dollar market:

```json
{ "id": "0x0050f4c7…dce8", "volume": "2000000", "fills": 1, "participants": 2 }
```

So the one-line fix on your side is needed: divide by 1e6 before anything the
bot posts. Your worst case was right — without it a $15 market is announced as
$15,000,000.00 from @joinringo, in public.

The reasoning, in case it is worth mirroring: converting in the mapping means
either a lossy float or a `BigDecimal`, and both put a rounding bug somewhere
invisible. Raw integers mean the index cannot be wrong about money. Only the
display can, and the display is one line.

---

## §03b Tags — impossible, and query #2 has a second problem

Confirmed from both sides: none of the four events carries tags or claim text,
so `Market.tags` is `[]` forever.

But query #2 does not fail silently the way you expected. It does not run at
all:

```
where: { status: RESOLVED, or: $tagClauses }
```

```
Cannot mix column filters with 'or' operator at the same level.
Found column filter(s) 'status' alongside 'or' operator.
```

graph-node wants `status` repeated *inside* each `or` clause. So the price hint
is broken twice over — invalid syntax, and nothing to match even once the syntax
is fixed. That is step 2 of the smoke test.

**Proposed fix, on your side, roughly one line:** resolve tag → questionIds in
Mongo, then ask for those ids directly. No `or`, no tags.

```graphql
markets(
  where: { status: RESOLVED, questionId_in: $questionIds }
  orderBy: resolvedAt, orderDirection: desc, first: $first
) { id questionId outcome volume fills resolvedAt }
```

Same answer shape, no schema change, and the tag logic sits where the tags
actually live. The empty fields stay in the schema so your current queries keep
validating while you switch.

---

## §04 Data source — applied, and the ABI is no longer blocking

`0x6816374F4Bf692A8b317d9b03cF510DD81C40841`, startBlock `76393440`, both data
sources. The Sepolia address is recorded in `docs/decisions.md` as the wrong
answer so nobody re-derives it from `.env.example`.

`libs/util/src/abis/RingoManager.abi.ts` never arrived, and the implementation
`0x3B9e0e3d0B8cDAc44734E6397B0ca53aC716A15f` is unverified on every explorer and
absent from Sourcify. So I reconstructed the ABI from the chain instead, in two
independent readings that agree:

- **Types.** keccak256 of each canonical signature matches the topic0 you
  listed. All four constants also appear verbatim in the implementation's
  runtime bytecode — which is how `RingoInvalidated` got confirmed at all, since
  it never fires inside the ~220k-block window public Polygon RPCs still serve.
- **`indexed`.** Read off the `LOG` opcode the compiler emits after each of
  those constants: `LOG4`, `LOG3`, `LOG3`, `LOG2` — 3, 2, 2 and 1 indexed
  parameters. For the three events that do fire, live logs agree to the byte:
  4 topics + 96 B of data, 3 + 0 B, 3 + 32 B.

**Three of the four were not what we assumed.** `questionId`, `userA`, `userB`
and the address on `RingoResolved` are all indexed. Deploying the guess would
have decoded every amount one word off — plausible numbers, all wrong.

Nothing is pending from you here any more. If the real ABI ever surfaces I would
still like to diff it against what I derived.

---

## §05a Correction: ringoId cannot come from calldata

Worth reading twice, because your doc recommends this path and I implemented it
before finding out.

`resolveRingo(bytes _ringoId)` is never what `transaction.input` holds. **Every
Ringo transaction is an ERC-4337 user operation:** `to` is EntryPoint
`0x0000000071727De22E5E9d8BAf0edAc6f37da032`, the input is
`handleOps(PackedUserOperation[],address)` — selector `0x765e827f` — and the
RingoManager call sits nested inside `ops[i].callData`. Both traders are smart
accounts, so this is every transaction, not an edge case.

`ethereum.decode("(bytes)", input)` against that **succeeds**. It hands back a
slice of the UserOp array: a long, plausible-looking value that differs per
transaction. The first deploy keyed markets on it and produced markets with
`volume: 0`, `fills: 0` and no joins at all — while reporting a healthy sync and
zero indexing errors. Your trap, one level deeper than the doc has it.

**Entities are now keyed on `keccak256(ringoId)`**, the indexed topic itself. It
is total, collision-free and always present; I checked that fills pair with their
own resolutions through it before switching.

**What this means for you:** anything holding a plaintext ringoId reaches its
market with `keccak256(ringoIdBytes)` — the raw bytes, not a utf8 string.
Written up in `subgraph/docs/queries.md`. Your query #1 filters on `questionId`,
so it is unaffected; anything that keys by market id is not.

---

## §05b The v1 creation event — agreed, now with numbers

Not decoding it, as you suggested. The consequence, measured: **1,227 of 10,006
markets carry no fill.** Those are v1-era markets that resolved inside our window
with no creation we decode, so the mapping stubs them rather than dropping the
resolution. Dropping them would have lost roughly a fifth of all settlements
while the index looked perfectly healthy.

One more thing for `market_stats`: **only 4,771 of 10,006 markets have a
`questionId`**, since `QuestionCreated` starts at block 85629763. Query #1
returns null for the rest — which by your own note is indistinguishable from "no
data", so the tool should say exactly that rather than report zeros.

---

## §06 Queries — I ran all three against the deployed schema

- **#1, stats by questionId — works.** `questionId` is `String` and `status` is
  a proper enum `OPEN | RESOLVED | INVALID`, as you asked.
- **#2, comparables by tag — does not compile.** See §03b.
- **#3, top traders — works** as written; `Trader` has `lastActive` and `volume`.

---

## Three things the events mean that we both had wrong

All settled by correlating events with their own transactions on mainnet.

**`RingoResolved`'s uint256 is an amount, not an outcome code.** It equals
`amountA + amountB` in every resolution I could pair with its own fill. It is the
gross pot rather than winnings: in `0x31cdbbcd…75bf` the event reads `2000000`
while the escrow transfers `1900000` to the winner. Do not render it as a payout
or as a settled option.

**The address beside it is the winner, not a resolver or an oracle.** In every
paired case it is one of the two traders, with both sides represented. Better
news than it sounds: `Trader.wins` and `Trader.losses` are populated from it, so
the record column we had written off as impossible is real. Wins are exact;
losses are inferred from the other side of the fill, so they undercount for
v1-era markets.

**The sixth address on `RingoCreatedAndFilled` is a per-ringo escrow, not the
settlement token.** Every fill carries a different one, and each is an ERC-1167
minimal proxy cloned from `0x777758f0abbe3bd758c4f0a6650d24d347f6a818`. In fill
`0xf9726a30…b184` it receives both 2.10 USDC stakes and forwards 0.021 to
FeesManager.

---

## One open number, flagged rather than buried

Fee accounting had a double count: both fee addresses sit in the `topic2` filter
and they pay each other, so an inbound-only rule booked the same fee twice. In
resolution `0x31cdbbcd…75bf` the escrow sends 0.09 USDC to FeesManager, which
forwards 0.035 twice to the fee recipient — 0.16 booked against a real fee of
0.09. Fixed: transfers whose sender is itself a fee address are now dropped.

Even after that, the take reads about **8.5% of settled volume** on the days
carrying both, which is well above what single settlements show on chain (0.09 on
a 2.00 pot, 0.021 on a 4.20 fill). **I have not explained the remainder.** If you
can reconcile it against kpi.joinringo.xyz that closes the last open figure.
Until then it is not a number to quote at a judge.

---

## Reconciliation — your counts against the index

Subgraph at block 93,414,154, three blocks off the chain head, no indexing
errors. Your last observed blocks are 93,334,340 to 93,355,333, so the index
covers a slightly longer window and should run a few events ahead.

| Event | Yours, Sep 7 | Subgraph | Gap |
|---|---|---|---|
| `RingoCreatedAndFilled` | 8,771 | 8,779 `Ringo` | +8 |
| `RingoResolved` | 9,654 | 9,660 `Resolution` | +6 |
| `QuestionCreated` | 4,763 | 4,771 with `questionId` | +8 |
| `RingoInvalidated` | 628 | 595 markets `INVALID` | −33 |

Three of four line up to the event, drifting in the direction and by the amount a
longer window predicts. The fourth is a different unit rather than a
discrepancy: `INVALID` is a status on a market, so 628 invalidation events land
on 595 distinct markets, and a market invalidated then resolved keeps whichever
arrived last.

---

## §01 Nullifier format — decimal, agreed

Decimal strings, canonicalised by stripping leading zeros, exactly as the backend
already does. No change requested.

One addition to your note: **IDKit v4 does not return `nullifier_hash`.** That
name is v3. In v4 the value lives at `result.responses[i].nullifier`, as hex, per
credential response. Same trap, different field name — the hex-to-decimal
conversion will live in the gate.

A second edge in the same area: if the claim flow ever sets
`allow_legacy_proofs: true`, one person holds two *different* nullifiers, a v3
one and a v4 one, and the unique index cannot connect them. They claim twice and
the index shows nothing wrong. Being built with legacy proofs off for that
reason — worth a line in your notes so nobody flips it on later for
compatibility.

---

## §07 Gate — contract noted, not built

Strict JSON boolean `true`, 200 only, no redirects and none followed, 3s budget.
Recorded in `worldid-gate/README.md`. This is the next thing I build.

---

## §09 Submission wording — agreed, and thank you for raising it

Taking the honest framing: at most one welcome credit per person **from the date
the gate was switched on**, no retroactive claim. The X Quest pause while
`WORLD_ID_GATE` is on is worth a line in the submission too — "what about your
other credit paths" is exactly the question a three-minute Q&A produces.
