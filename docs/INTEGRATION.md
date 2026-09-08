# Integration contracts

Every HTTP contract between the pieces in this repository and the Ringo
platform. If you are implementing one side of an arrow in the README's
architecture diagram, the other side is specified here.

No secrets appear in this document. Environment variable **names** are listed;
values are configured per environment and never committed.

Facts below are marked **verified** where they were measured against the live
subgraph, the live chain, or a running service, and **from the docs** where they
come from World's published API reference. Nothing here is assumed.

---

## 1. The nullifier format

**Decimal string, 1 to 78 digits, leading zeros stripped.** This is the single
most likely integration mistake, so it comes first.

IDKit returns the nullifier as `0x`-prefixed hex. The platform's claim endpoint
accepts **decimal only** and rejects hex with a `400`. They are the same number
in two spellings, and one side has to convert. `worldid-gate` converts, because
it is the only component that ever sees an IDKit payload.

The platform canonicalizes before storing, by stripping leading zeros:

```
"123"     -> "123"
"0123"    -> "123"
"000123"  -> "123"
"0"       -> rejected (not a real field element)
```

**Verified:** `"123"` and `"0123"` both insert under a unique index in a real
MongoDB. They are distinct keys. Without canonicalization one person could
claim once per leading zero they added, up to the field width.

`worldid-gate/src/nullifier.js` and the platform's `canonicalizeNullifier` are
two copies of one definition. If they ever disagree, the platform's index stops
colliding for a person the gate considers already seen, and that person is paid
twice. There are tests on both sides asserting that every spelling of one human
collapses to one key.

> Changing this normalization after rows exist is not a code-only change. Rows
> written under the old spelling stop colliding with the new one, and every
> already-verified person could claim again.

### Where the nullifier lives in an IDKit v4 payload

**From the docs.** v4 does not use the v3 field name `nullifier_hash`. In the
payload the client receives, the value is per credential response at
`result.responses[i].nullifier`, as hex.

But the gate does not read it from there. It forwards the payload to World and
takes the nullifier from **World's response**, which carries it at the top
level. A client controls its own request body; it does not control what World
says back. Reading the client's copy would let anyone register any nullifier
they liked.

---

## 2. `worldid-gate`: the endpoint the platform calls

The platform calls exactly one endpoint on the gate.

```http
GET {WORLDID_GATE_URL}/status?nullifier=<decimal string>
```

```json
200 { "verified": true }
200 { "verified": false }
```

### What counts as verified

Only the **literal boolean `true`**. Every one of the following is treated as
*not verified*, and no credit is granted:

| Response | Result |
|---|---|
| `{ "verified": "true" }` (string) | not verified |
| `{ "verified": 1 }` | not verified |
| `{ "verified": "false" }` | not verified |
| `{}` or a missing field | not verified |
| A `200` with an HTML body | not verified |
| Any status other than `200` | not verified |
| A `3xx` redirect | not verified (redirects are not followed) |
| A timeout | not verified |

So: return a real JSON boolean, and do not redirect. The client sets
`maxRedirects: 0` deliberately, because a redirect to a host that happens to
serve `{"verified":true}` would otherwise be read as the gate's own answer on a
call that authorizes a payment.

Timeout is `WORLDID_GATE_TIMEOUT_MS`, default 3000.

**Verified:** the implementation in `worldid-gate/` answers all of the above
correctly, including a `400` for a malformed nullifier whose body still reads
`{"verified": false}`.

### The endpoints the platform does *not* call

`POST /verify` and `POST /rp-signature` are called by the claim UI only. The
platform never sees a proof.

---

## 3. `POST /verify`: the endpoint the claim UI calls

**From the docs.** Forward the IDKit result payload **as-is**, with no field
remapping. The gate relays it to:

```http
POST https://developer.world.org/api/v4/verify/{rp_id}
```

Note the domain: v4 is `developer.world.org`, not `developer.worldcoin.org`, and
the path parameter is `rp_id`, not `app_id`.

Request body, uniqueness v4:

```
protocol_version  "4.0"
nonce
action
responses[]       { identifier, issuer_schema_id, nullifier,
                    expires_at_min, proof, signal_hash }
```

Request body, legacy v3:

```
protocol_version  "3.0"
nonce
action
responses[]       { identifier, proof, merkle_root, nullifier,
                    signal_hash, max_age }
```

Success and failure:

```json
200      { "success": true, "action": …, "nullifier": …, "created_at": …,
           "environment": …, "session_id": …, "results": [], "message": … }
400/404  { "success": false, "code": …, "detail": … }
```

### Legacy proofs are refused, and this is the important part

`selfieCheckLegacy` is a **v3 preset**, and `allow_legacy_proofs: true` lets
World App satisfy the request with a v3 proof.

A v3 proof and a v4 proof for the **same person** carry **different
nullifiers**. No index can connect them. Enable legacy proofs and one human
holds two identities, claims the credit twice, and every uniqueness check
reports success the whole way through. That is precisely the failure this
feature exists to prevent.

So the gate refuses `protocol_version: "3.0"` unless
`GATE_ALLOW_LEGACY_PROOFS=true` is set explicitly, and it warns at boot when it
is. If the claim UI uses a legacy preset, that is the decision to revisit, not
this flag.

### The RP signature

**From the docs.** `rp_context` is `{rpId, nonce, createdAt, expiresAt,
signature}` and must be built in a backend. The signing algorithm is secp256k1
ECDSA over keccak256, matching `SignRequest` in `@worldcoin/idkit-server`.

The RP signing key is what lets anyone forge a request from this app. It never
goes in client code, and it should be read from a secrets store at runtime
rather than from a plain environment variable. The gate deliberately does not
implement this endpoint and does not read the key: signing an identity request
is not something to hand-roll. Whoever builds the claim UI calls the vendor's
signer there.

---

## 4. `POST /welcome-bonus/claim`: the platform endpoint the claim UI calls

```http
POST /welcome-bonus/claim
Authorization: Bearer <dynamic_jwt>
Content-Type: application/json

{ "nullifier": "<decimal string>", "channelSlug": "<optional>" }
```

```json
200 { "outcome": "granted", "amount": 5, "balanceAfter": 5 }
```

### Outcomes

| Response | Meaning | What the UI should do |
|---|---|---|
| `granted` | Credit applied | Show the new balance |
| `already_claimed` | This person already received it, possibly on another of their accounts | Not an error. This is the feature working |
| `disabled` | The gate is switched off in this environment | Not an error. Expect this before the flag is enabled |
| `verification_required` | No nullifier, or the gate did not confirm it | Send the user into the World ID flow |
| `401` | Missing or invalid session token | Re-authenticate |
| `422` | The session carries no stable numeric platform id | See below |
| `429` | Rate limited, per wallet | Back off and retry |

### The body carries no identity

`address`, `platform` and the external user id are **all** derived from the
verified session. The body carries only the nullifier and an optional channel. A
body-supplied identity would let any authenticated user write a ledger row
against a wallet they do not own, or consume another person's one-time
idempotency key, so unknown body fields are rejected outright.

### Two constraints to design around

**X accounts only, for now.** A session authenticated through Kick receives a
`422`. Kick credits have to land on a different address than the one the session
exposes, and crediting the wrong one would consume the person's single nullifier
against a balance they cannot see. Kick users claim through chat instead.

**The `422` also fires when the identity provider does not supply a stable
numeric account id.** The platform refuses rather than falling back to a handle,
because handles are rename-mutable and keying on one would mint a second
identity for the same person on every rename, which is the exact thing this
feature exists to prevent.

---

## 5. Environment variables

Names only. Values are per environment.

### Platform side, subgraph

| Variable | Default | Purpose |
|---|---|---|
| `SUBGRAPH_ENABLED` | `false` | Master gate. Off means zero outbound requests |
| `SUBGRAPH_URL` | none | Studio query URL, then the gateway URL after publishing |
| `SUBGRAPH_API_KEY` | none | Sent as `Authorization: Bearer`, never in the URL |
| `SUBGRAPH_TIMEOUT_MS` | `5000` | Per-request timeout |
| `SUBGRAPH_CACHE_TTL_S` | `30` | In-memory response cache |
| `SUBGRAPH_PRICE_HINT` | `false` | Gates the create-time comparables line specifically |

**Verified:** the current deployment is a Studio subgraph and **needs no API
key**. Identical `200` and identical body with and without an `Authorization`
header. Do not put the Studio *deploy* key there: that credential authorises
deploying code, and it would be sent on every query to a service that ignores
it. A query key starts mattering only after `graph publish` moves queries to the
gateway.

**Verified:** use the `version/latest` form rather than a pinned version label
while the subgraph is still being redeployed. A pinned label returns
`200 {"message":"Not found"}` once a new version is published, which is a
failure that looks like a healthy response.

### Platform side, World ID

| Variable | Default | Purpose |
|---|---|---|
| `WORLD_ID_GATE` | `false` | Master gate. Off means the claim endpoint grants nothing |
| `WORLDID_GATE_URL` | none | Base URL of the gate service |
| `WORLDID_GATE_TIMEOUT_MS` | `3000` | Per-request timeout |

### Gate side

See `worldid-gate/.env.example`. The RP signing key is **not** among them.

Both platform master flags are strict equality against the string `"true"`.
`"TRUE"`, `"1"` and `"yes"` all mean off, deliberately, so an ambiguous value
across environments cannot half-enable a feature that moves money.

The API key is sent as a header rather than embedded in the URL because error
objects from HTTP clients carry the request configuration, including the URL,
and error objects end up in logs.

---

## 6. Deployment order

The uniqueness constraint is the entire guarantee, and it is not built by
declaring it. The order is not optional:

1. Deploy the platform code with `WORLD_ID_GATE` unset.
2. Run the index migration.
3. Confirm the index exists, including its options, not just its name.
4. Point `WORLDID_GATE_URL` at a running gate and confirm
   `GET /status?nullifier=1` answers `200 {"verified": false}`.
5. Only then enable the flag.

Enabling the flag before step 2 produces a system that reports success on every
claim while enforcing nothing, with a fully green test suite. The platform
mitigates this by refusing to grant when it cannot see the index, but that is a
backstop, not a substitute for running the migration.

Step 4 is safe to do early: the gate answers `{"verified": false}` correctly
from an empty database, so the platform can be pointed at it before the claim UI
exists.
