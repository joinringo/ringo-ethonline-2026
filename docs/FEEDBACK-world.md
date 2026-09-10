# Feedback for World

Required by both World tracks. Written as we went, not reconstructed at the end.

Everything below is first-hand. Where a section is not first-hand it says so and
stays empty rather than being filled in with plausible-sounding text, because a
feedback document that guesses is worse than a short one.

Attribution, since [`AI-USE.md`](AI-USE.md) makes the point at length: the claim
flow, the Developer Portal setup and `worldid-gate/` were written by an AI
coding agent working in Manuel's terminal. Facu built the subgraph and the stats
app, which are not World-facing.

---

## The claim flow and the Developer Portal

### Selfie Check: docs and integration

**The published personhood example uses a v3-only preset.**
`docs.world.org/world-id/idkit/integrate` shows `preset={orbLegacy({ signal })}`.
`orbLegacy` is documented in the shipped type definitions as *"This preset only
returns World ID 3.0 proofs. Use it for compatibility with older IDKit
versions."* Following that page gives you v3 proofs and, combined with the
nullifier discontinuity in section 1 below, silently ends any uniqueness
guarantee built on the result. The non-legacy preset is `proofOfHuman`. We only
found this because we stopped reading prose and read `idkit-core`'s `index.d.ts`
instead. **This is the single highest-value fix on this page.**

**There is no preset for the v4 selfie credential.** The preset list is
`proofOfHuman`, `passport`, `mnc`, `identityCheck`, and five `*Legacy` entries.
The credential named in this prize therefore cannot be requested through the
documented preset API at all: you have to drop to
`constraints={CredentialRequest('selfie')}`. Nothing signposts that, and
`preset` and `constraints` are mutually exclusive in the config type, so
discovering it means reading the union rather than the examples. A one-line
`selfieCheck()` preset would remove the whole problem.

**A bare `selfieCheck` appears in the official example but is not published.**
The Next.js example on `main` imports it; it does not exist in 4.2.3 or 4.2.4.
Zero occurrences in either dist. Copying the official example gives an import
error.

**The RP context rename is four fields, not one.** It is commonly reported as
`sig` becoming `signature`. It is worse than that: `signRequest` returns
`{ sig, nonce, createdAt, expiresAt }` and `RpContext` wants
`{ rp_id, nonce, created_at, expires_at, signature }`. Three renames, a case
convention change, and an `rp_id` that `signRequest` never returns and you have
to inject. Every one of those fails as a rejected proof rather than a type
error. A `toRpContext(rpId, signed)` helper in `idkit-server` would delete this
entire class of bug.

**Selfie Check is Beta and gated per app, and nothing on the integration path
says so.** The credentials page carries the sentence "Request access to enable
Selfie Check (Beta) for your app", but by the time we read it we had built the
entire flow. What a developer actually experiences is `credential_unavailable`,
which reads as "this user lacks the credential" and sends you to check the
user's World App rather than your own app's entitlements. **The Developer Portal
should say, on the app itself, whether Selfie Check is enabled**, and the error
for a not-entitled app should differ from the error for a not-credentialed user.
Those are two completely different problems and today they are the same string.

**The bigger one: Selfie Check is v3-only, and that collides with World's own
nullifier semantics.** The credentials page says the preset "currently uses
World ID 3.0; World ID 4.0 support is not yet available", while
`CredentialRequest('selfie')` ships in the published 4.2.x SDK. So the SDK
offers a path the service does not support, and a team reading types rather than
prose, which is what we had to do to avoid the `orbLegacy` trap above, walks
straight into it.

Follow that through and it becomes structural rather than cosmetic. A v3 proof
and a v4 proof carry different nullifiers for the same person. Any team building
a uniqueness guarantee on Selfie Check today is therefore forced onto legacy
proofs, which is exactly the configuration the discontinuity makes dangerous.
The two pieces of guidance point in opposite directions and nothing acknowledges
the tension.

There is a safe answer, and we would have liked to read it rather than derive
it: **accept exactly one protocol version, not "legacy as well".** Our gate now
takes `GATE_REQUIRE_PROTOCOL=3.0`, which accepts v3 and refuses v4, instead of
the `allow_legacy_proofs`-shaped flag that accepts both. One protocol means one
nullifier per human and the guarantee holds. Two protocols is the failure. That
distinction deserves to be in the docs, because the obvious flag name leads
every integrator to the wrong one of the two.

**`allow_legacy_proofs` is required, not optional.** Reasonable, given section 1,
and worth saying out loud in the docs since it is the one required field a
reader will not expect.

### Developer Portal navigation, discovery and debugging

**The MCP server is excellent and undersold.** Creating the app, the managed
relying party with its KMS-backed manager key, the on-chain registration on
production and staging, and the action in both environments took four calls and
under a minute. Registration came back `pending` with an explicit instruction to
poll the status endpoint, and was `registered` and synced by the time we
checked. For an integration where the usual failure is a half-configured app,
this is the right shape and it should be the front door in the docs, not a
footnote.

**The signing key is returned exactly once, with no confirmation step.**
`configure_world_id` returns `signing_key.private_key` in the response body and
the portal does not retain it. There is no "have you stored this?" acknowledgement
and no second chance; the only recovery is rotation, which invalidates anything
already signed. We piped it straight into a secrets store in the same command
that created it. A hackathon team pasting into a terminal will lose this, and
the warning string in the response is doing a lot of work alone.

**Debugging guidance is the real gap.** When a proof is refused you get a code.
What is missing is a table mapping each code to *which side* is at fault: the
proof, the RP signature, the action binding, the environment, or the relying
party's registration state. We built our own by sending deliberately malformed
payloads and recording what came back. That table should ship.

**A concrete, cheap win we found:** posting a syntactically valid but
cryptographically invalid v4 proof returns `validation_error`, whereas an
unregistered relying party returns a different failure entirely. That single
difference is enough to prove your `rp_id` is live without a phone, a test user,
or a real proof, and it is the check we now run first. Documenting it as
"how to smoke-test your RP" would save every team the same afternoon.

### Testing with the Sandbox app

**Not written, deliberately.** Nobody on this team has driven the Sandbox App
end to end yet, and this is the section the prize explicitly asks about, so
filling it with inference would be the wrong call.

[TODO: Facu or Manuel, after one real run. What the states are, whether a test
user can hold a selfie credential, what a refusal looks like from the app side,
and what is hard to reproduce on purpose.]

### Confusing, missing or broken: the short list

1. **`orbLegacy` in the personhood example.** v3-only, contradicts the types.
2. **No preset for the v4 selfie credential**, the one this prize is named after.
3. **`selfieCheck` in the official example is unpublished.**
4. **`github.com/worldcoin/idkit-js` is stale and still ranks.** Last pushed
   April 2026, README documents the v3 `IDKitWidget` with `actionId`. The live
   repository is `worldcoin/idkit`. Archive the old one or add a banner.
5. **The package ships no `"use client"` directive.** It imports `useState` and
   `createPortal`, so in a Next.js App Router project every consumer must add
   the directive to their own wrapper. Shipping it in the package would be one
   line and would remove a first-run error for the entire App Router audience.
6. **Nothing tells you which hosts to allowlist.** Any app with a Content
   Security Policy needs `https://bridge.worldcoin.org` in `connect-src` and
   `https://world-id-assets.com` in `font-src`. Neither appears in the docs. We
   found the first by extracting strings from `idkit_wasm_bg.wasm` and the
   second by grepping the dist. This one is nastier than it sounds, because CSP
   violations are console-only: the widget renders, the QR appears, and the
   connection simply never completes. Nothing errors. **A "CSP and network
   requirements" section would prevent a silent, unexplainable failure.**
7. **The verify response's `results[]` shape is underspecified.** We wanted to
   enforce that the credential actually presented was `selfie`, rather than
   merely requesting it, since the request is a client-side parameter and only
   the response is evidence. We could not find a normative description of the
   per-credential result entries, so we shipped that enforcement behind a flag
   that is off, and we log what arrives instead. We would rather have shipped it
   on.

---

## Manuel, on the verification service and the backend

Four things cost real time. The first two are documentation problems with a
security consequence, which is why they lead.

### 1. The v3-to-v4 nullifier discontinuity deserves a warning, not a footnote

This is the most dangerous thing we found, and it is the thing a newcomer is
least likely to notice.

`selfieCheckLegacy` is a **v3 preset**, and `allow_legacy_proofs: true` is what
lets World App satisfy such a request with a v3 proof. A v3 proof and a v4 proof
**for the same person carry different nullifiers**, and nothing can connect
them.

Now consider the ordinary reason someone sets that flag: compatibility. An app
ships, some users are on an older World App, so the developer flips
`allow_legacy_proofs` to true to widen support. In doing so, every person who
can produce both proof versions gets two identities. If the nullifier is the key
to something scarce, and in our case it gates a payment, that person can claim
twice. **Every uniqueness check still reports success the whole way through.**
There is no error, no warning, and no log line. The only symptom is that the
guarantee is silently gone.

The two facts are documented separately and correctly. What is missing is the
sentence that joins them: *turning on legacy proofs means one human can hold two
nullifiers, so do not do it if the nullifier gates anything unique.* We ended up
enforcing this in our own service, which refuses `protocol_version: "3.0"`
unless an operator opts in explicitly and gets a warning at boot. We would
rather the SDK had told us.

There is also a smaller version of the same trap: choosing the
`selfieCheckLegacy` preset and setting `allow_legacy_proofs: false` are in
tension with each other, and nothing surfaces that.

### 2. Where the nullifier comes from is a security decision presented as a shape

The IDKit result payload contains a nullifier, at
`result.responses[i].nullifier`. The verify response ALSO contains one, at the
top level. Both are documented. Nothing says which one to store.

They are not equivalent. A client controls its own request body; it does not
control what World says back. An implementation that records the client's copy
lets any caller register any nullifier it likes, which for us would mean
registering a stranger's nullifier to lock them out, or registering a fresh one
per claim to defeat the fence entirely. Taking it from the verify response is
the only safe choice, and it is currently something you have to reason out
rather than read.

One line in the reference would fix it: **store the nullifier from the
verification response, never the one in the payload you forwarded.**

### 3. The v4 endpoint moved domain and changed a path parameter

`https://developer.world.org/api/v4/verify/{rp_id}` versus the v1 and v2
`https://developer.worldcoin.org/api/v{1,2}/verify/{app_id}`. Both the host and
the parameter name changed, and `app_id` to `rp_id` is not a rename of the same
value.

Search results and older integration guides still point at the worldcoin.org
host. Because a wrong host fails as a network or 404 error rather than as an
auth error, the natural first guess is that credentials are wrong, which sends
you back to the Developer Portal instead of to the URL. A prominent "v4 moved
to world.org" note on the API reference would have saved us the detour.

### 4. `docs.world.org/world-id/idkit/verification-flows` does not contain the
### verification flow API

The page covers Hot, Cold and Semi-cold flows and platform behaviour for
installation, then refers to "per-SDK sections" for code samples. Landing there
from a search for `useIDKitRequest`, which is what the page title promises, you
get architecture and no API. The per-SDK pages have what you need; the routing
to them is the problem.

### What went right, since feedback that is only complaints is less useful

- **`POST /verify` takes the IDKit payload as-is, with no field remapping.** The
  docs are explicit about this and it is the right call. Remapping is how a
  field quietly stops being checked, and we would have been tempted to build a
  translation layer that later drifted.
- **The RP signature model is the correct shape.** Signing requests with a
  server-held key, in line with OAuth client secrets and WebAuthn RP keys, means
  a leaked app id alone is not enough to forge a request. The docs are clear that
  the key never goes near client code. We chose not to implement the signing
  ourselves and to call `SignRequest` from `@worldcoin/idkit-server` instead,
  precisely because that boundary is well drawn.
- **The success response carries a real JSON boolean.** We fail closed on
  anything that is not the literal `true`, and having a strict boolean rather
  than a stringly-typed status made that easy to enforce and easy to test.

### One request

A short "uniqueness in practice" page. Not the protocol, and not the SDK: the
operational half. What a nullifier is stable across and what it is not, what
changes it, and what happens to a uniqueness guarantee built on it when you flip
`allow_legacy_proofs`, when a user reverifies, or when you change RP. We
reconstructed most of that from the API reference plus experiments, and it is
the part that decides whether an integration is actually sybil-resistant or only
looks it.
