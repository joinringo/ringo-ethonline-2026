# Feedback for World

Required by both World tracks. Written as we went, not reconstructed at the end.

Two people integrated: Facu built the claim flow and the Developer Portal setup,
Manuel built `worldid-gate/` and the platform side that calls it. The sections
are attributed, because the two halves hit different things.

---

## Facu, on the claim flow

### Selfie Check: docs and integration

[TODO: Facu]

Already worth reporting: the integration snippets circulating for this flow
show an `IDKitWidget` component with `app_id`, `action` and `signal` as props.
That component does not exist in `@worldcoin/idkit` v4. The current API is
`IDKitRequestWidget` / `useIDKitRequest`, with the signal moving inside a
preset, `selfieCheckLegacy({ signal })`. Anyone following an older guide hits
a missing export before they hit anything else.

Second: `RpContext` expects a field named `signature`, while the RP signing
example returns it as `sig`. Small, but it costs a debugging session because
the failure surfaces as a rejected proof rather than a type error.

### Developer Portal navigation

[TODO: Facu]

### Testing with the Sandbox app

[TODO: Facu]

### Confusing, missing or broken

[TODO: Facu]

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
