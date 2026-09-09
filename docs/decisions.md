# Decisions log

One line per decision, with the date and who made it. This is also where
answers from the ETHGlobal Discord land.

## Open

- Slot 3: AgentKit or Bazantic. [TODO: Facu]

### Closed Sep 9

- **`graph publish`: no.** The Graph's prize text names Subgraph Studio as a
  qualifying provider, verbatim: "Consume live data from a Graph provider, for
  example querying Subgraphs with an API key from Subgraph Studio". Publishing
  to the decentralized network buys no eligibility, and a freshly published
  subgraph has to be picked up by an indexer and resynced before its gateway URL
  answers anything at all. Studio stays.
- **`questionId_in`: no.** `Market.id` is `keccak256(ringoId)` and reaches all
  10,006 markets; `questionId` reaches 4,771, and in the last 30 days 1,506 of
  2,584 markets have none. Keying on `questionId` answered "unavailable" for
  most markets a user could ask about today.
- **The backend already hashes.** `marketId` is `keccak256(ringoId)`, and the
  `market_stats` tool computes it with `ethers.keccak256(ringoId)` guarded by an
  `isHexString(ringoId, 32)` check. Nothing left to tell Manuel.
- **The World credential is Selfie Check, requested as the v4 `selfie`
  credential** rather than the `selfieCheckLegacy` preset. That preset has the
  right name and the wrong protocol: it returns v3 proofs only, and a v3 proof
  carries a different nullifier for the same person than a v4 one, so accepting
  it would let one human claim twice while every uniqueness check reported
  success. Selfie Check is also the credential this feature actually wants: it
  is an abuse-prevention signal on a free credit, held by far more people than
  orb personhood, so gating on `proofOfHuman` would have refused most genuine
  claimants.
- **The gate now reads which credential World says was presented** and logs it
  on every verification. Enforcement is one env var, `GATE_REQUIRE_CREDENTIAL`,
  and it is deliberately unset until a real proof confirms the response shape.
  Failing closed on an unconfirmed field name is how a working service starts
  refusing everyone; the log is what turns the flag on from evidence.

### The World relying party, Sep 9

Created through the Developer Portal. These two are public by design; World's
own example ships them as `NEXT_PUBLIC_` variables.

- App: `app_322c4e29ae1f5d33d0af7feb978c55a7` (production, external, cloud)
- Relying party: `rp_fcf35b06aa54d927`, managed mode, **registered on-chain on
  both production and staging**
- Action: `welcome-credit`, created in both environments. This string must be
  byte-identical in three places: the Portal action, the gate's
  `WORLDID_ACTION`, and the web app's. `signRequest` hashes it into the signed
  message, so a mismatch invalidates the signature rather than merely failing
  the gate's own check.
- Verify endpoint: `https://developer.world.org/api/v4/verify/rp_fcf35b06aa54d927`

The RP signing key is **not** in this repo and never will be. It is returned by
World exactly once at generation and lives in the secrets store.

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

  Confirmed against World's docs after this was written, and it sharpens the
  decision: `selfieCheckLegacy` is **itself the v3 preset**, and
  `allow_legacy_proofs: true` is what lets World App satisfy such a request
  with a v3 proof. So picking that preset and setting the flag to `false` are
  in tension, and the preset is the half to revisit. `worldid-gate` enforces
  the decision from its own side regardless: it refuses
  `protocol_version: "3.0"` unless `GATE_ALLOW_LEGACY_PROOFS=true` is set
  explicitly, so a claim flow that quietly starts sending legacy proofs is
  refused rather than silently double-crediting.
- The stats page stays in this repo, at the root, rather than moving into the
  production app: it reads only from the subgraph, so it is the artifact a
  judge can run to check that the index is load-bearing.
