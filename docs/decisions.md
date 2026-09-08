# Decisions log

One line per decision, with the date and who made it. This is also where
answers from the ETHGlobal Discord land.

## Open

- Slot 3: AgentKit or Bazantic. [TODO: Facu]
- Whether the backend switches its comparables query to `questionId_in`. See
  `docs/REPLY-manuel.md`.
- Whether to `graph publish` to the network. Needs a wallet with ETH on
  Arbitrum One, and a freshly published subgraph has to be picked up by an
  indexer and resynced 17M blocks before its gateway URL answers anything.
  Studio is what the app points at until a network endpoint returns real data.
- The backend must hash: `marketId` is now `keccak256(ringoId)`, not
  `ringoId`. [TODO: tell Manuel — see `subgraph/docs/queries.md`]

### Closed Sep 7, from the chain rather than from the ABI

The private ABI never arrived and the implementation
`0x3b9e0e3d0b8cdac44734e6397b0ca53ac716a15f` is unverified on every explorer
and on Sourcify, so `abis/RingoManager.json` was reconstructed from mainnet.
Method and evidence in `subgraph/README.md`.

- **Which parameters are `indexed`** — settled. Read off the `LOG` opcode
  after each event's `topic0` constant in the implementation bytecode:
  `LOG4`, `LOG3`, `LOG3`, `LOG2`. Cross-checked against live logs for the
  three events that fire, matching topic count and data length exactly.
  **Three of the four guesses were wrong**: `questionId`, `userA`, `userB`
  and the address on `RingoResolved` are all indexed. The deploy this entry
  used to block would have decoded every amount one word off.
- **What `RingoResolved`'s uint256 encodes** — settled without Manuel. It is
  an amount in raw USDC units, equal to `amountA + amountB` in every
  resolution that could be paired with its own fill. It is the gross pot, not
  winnings: in `0x31cdbbcd…75bf` the event reads 2.000000 while the escrow
  transfers 1.900000 to the winner. The schema field keeps the name
  `outcome` because the backend already queries it.
- **The sixth address on `RingoCreatedAndFilled`** — settled. Not the token:
  a different address per fill, each an ERC-1167 minimal proxy cloned from
  `0x777758f0abbe3bd758c4f0a6650d24d347f6a818`. It is the per-ringo escrow —
  in fill `0xf9726a30…b184` it receives both 2.10 stakes and forwards 0.021
  to FeesManager.
- **The address beside it on `RingoResolved` is the winner**, not a resolver
  or an oracle: in every paired resolution it is one of the two traders, with
  both sides represented. `Trader.wins` and `losses` are populated from it,
  so the record column this repo had written off is real.

## Made

### From Manuel's integration doc, Sep 7

- Contract, verified on mainnet: `0x6816374F4Bf692A8b317d9b03cF510DD81C40841`,
  startBlock `76393440` (proxy creation, 2025-09-13T09:17:33Z). The other
  address in circulation, `0xac2b7d6e98b3CC643ea0fE4E93e3864f9c426417`, has no
  code on Polygon — it is the Sepolia proxy and the default in the backend's
  `.env.example`, which makes it the easiest wrong answer to reach for.
- All four event signatures confirmed by matching keccak256 against the topic0
  values read off mainnet. Every earlier guess was wrong: `bytes` not `bytes32`
  for the id, no claim string on `QuestionCreated`, an extra address on
  `RingoCreatedAndFilled`, and a uint256 rather than a string outcome.
- `ringoId` is `indexed` on a dynamic `bytes`, so the topic holds
  keccak256(value) and never the value. **Superseded Sep 7:** recovering it
  from calldata does not work here. Every Ringo transaction is an ERC-4337
  UserOperation, so `transaction.input` is EntryPoint's `handleOps` and the
  call sits inside `ops[i].callData` — and `ethereum.decode("(bytes)", …)`
  against that succeeds, returning a slice of the UserOp blob. Entities now key
  on the topic hash itself; callers hash before querying.
- Markets resolve without a creation we can decode: the v1 creation event has a
  different signature and is not indexed, but 9,654 resolutions run against
  8,771 fills. The mapping stubs a market on resolve rather than dropping the
  event.
- `tags` and `claim` are not on chain at all. They stay in the schema, empty and
  documented, so the backend's queries keep validating while it moves to
  `questionId_in`.
- Volume is stored as the raw 6-decimal integer. Converting in the mapping
  would put a rounding bug somewhere invisible.
- Nullifiers are decimal strings, canonicalised without leading zeros, matching
  the backend. Note that IDKit v4 returns hex under `responses[].nullifier`,
  not `nullifier_hash`.
- AssemblyScript will not compile a nullable `string` return through the graph
  CLI — it crashes the compiler rather than reporting a type error. Worth
  knowing, though the ringoId helper no longer needs a sentinel: keying on the
  topic hash cannot fail, so no handler bails out any more.

- RingoManager on Polygon mainnet is
  `0x6816374F4Bf692A8b317d9b03cF510DD81C40841`. The other address in the field
  manual, `0xac2b7d6e98b3CC643ea0fE4E93e3864f9c426417`, is the Sepolia
  deployment. Confirmed by Facu, Sep 6.

- Subgraph indexes USDC fee transfers with a `topic2` filter rather than
  filtering in the handler. Without it the subgraph would index every USDC
  transfer on Polygon and never finish syncing.
- The stats page renders per request with a 60s data cache, not ISR, so a
  deploy during a subgraph resync does not fail the build.
- `allow_legacy_proofs: false` in the claim flow (which lives in the
  app.joinringo.xyz repo). Accepting v3 proofs means one human holds two
  different nullifiers and can claim twice unless the gate stores both.
- The stats page stays in this repo as `demo/` rather than moving into the
  production app: it reads only from the subgraph, so it is the artifact a
  judge can run to check that the index is load-bearing.
