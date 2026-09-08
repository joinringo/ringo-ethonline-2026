# Integration contracts

Every HTTP contract between the three pieces in this repository and the Ringo platform. If you are
implementing one side of an arrow in `ARCHITECTURE.md`, the other side is specified here.

No secrets appear in this document. Environment variable **names** are listed; values are configured
per environment and never committed.

---

## 1. The nullifier format

**Decimal string, 1 to 78 digits.** This is the single most likely integration mistake, so it comes
first.

IDKit returns `nullifier_hash` as a `0x`-prefixed hex string. The platform's claim endpoint accepts
decimal only and rejects hex with a `400`. They are the same number in two spellings, and both the gate
and the frontend have to agree on one.

The platform also canonicalizes before storing, by stripping leading zeros:

```
"123"     -> "123"
"0123"    -> "123"
"000123"  -> "123"
"0"       -> rejected (not a real field element)
```

This is not cosmetic. `"123"` and `"0123"` are **distinct keys** in a unique index, verified against a
real MongoDB. Without canonicalization, one person could claim once per leading zero they added.

> Changing this normalization after rows exist is not a code-only change. Rows written under the old
> spelling stop colliding with the new one, and every already-verified person could claim again.

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

Only the **literal boolean `true`**. Every one of the following is treated as *not verified*, and no
credit is granted:

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

So: return a real JSON boolean, and do not redirect. The client sets `maxRedirects: 0` deliberately,
because a redirect to a host that happens to serve `{"verified":true}` would otherwise be read as the
gate's own answer on a call that authorizes a payment.

Timeout is `WORLDID_GATE_TIMEOUT_MS`, default 3000.

### The endpoints the platform does *not* call

`POST /rp-signature` and `POST /verify` are called by the frontend only. The platform never sees a
proof.

---

## 3. `POST /welcome-bonus/claim`: the endpoint the frontend calls

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
| `disabled` | The gate is switched off in this environment | Not an error. Expect this on staging before the flag is enabled |
| `verification_required` | No nullifier, or the gate did not confirm it | Send the user into the World ID flow |
| `401` | Missing or invalid session token | Re-authenticate |
| `422` | The session carries no stable numeric platform id | See below |
| `429` | Rate limited, per wallet | Back off and retry |

### The body carries no identity

`address`, `platform` and the external user id are **all** derived from the verified session. The body
carries only the nullifier and an optional channel. A body-supplied identity would let any authenticated
user write a ledger row against a wallet they do not own, or consume another person's one-time
idempotency key, so unknown body fields are rejected outright.

### Two constraints to design around

**X accounts only, for now.** A session authenticated through Kick receives a `422`. Kick credits have
to land on a different address than the one the session exposes, and crediting the wrong one would
consume the person's single nullifier against a balance they cannot see. Kick users claim through chat
instead.

**The `422` also fires when the identity provider does not supply a stable numeric account id.** The
platform refuses rather than falling back to a handle, because handles are rename-mutable and keying on
one would mint a second identity for the same person on every rename, which is the exact thing this
feature exists to prevent.

---

## 4. Environment variables

Names only. Values are per environment; the API key belongs in a secrets store, never in a plain
environment variable.

### Platform side, subgraph

| Variable | Default | Purpose |
|---|---|---|
| `SUBGRAPH_ENABLED` | `false` | Master gate. Off means zero outbound requests |
| `SUBGRAPH_URL` | none | Studio query URL, then the gateway URL after publishing |
| `SUBGRAPH_API_KEY` | none | Sent as `Authorization: Bearer`, never in the URL |
| `SUBGRAPH_TIMEOUT_MS` | `5000` | Per-request timeout |
| `SUBGRAPH_CACHE_TTL_S` | `30` | In-memory response cache |
| `SUBGRAPH_PRICE_HINT` | `false` | Gates the create-time comparables line specifically |

### Platform side, World ID

| Variable | Default | Purpose |
|---|---|---|
| `WORLD_ID_GATE` | `false` | Master gate. Off means the claim endpoint grants nothing |
| `WORLDID_GATE_URL` | none | Base URL of the gate service |
| `WORLDID_GATE_TIMEOUT_MS` | `3000` | Per-request timeout |

Both master flags are strict equality against the string `"true"`. `"TRUE"`, `"1"` and `"yes"` all mean
off, deliberately, so an ambiguous value across environments cannot half-enable a feature that moves
money.

The API key is sent as a header rather than embedded in the URL because error objects from HTTP clients
carry the request configuration, including the URL, and error objects end up in logs.

---

## 5. Deployment order

The uniqueness constraint is the entire guarantee, and it is not built by declaring it. The order is
not optional:

1. Deploy the platform code with `WORLD_ID_GATE` unset.
2. Run the index migration.
3. Confirm the index exists, including its options, not just its name.
4. Only then enable the flag.

Enabling the flag before step 2 produces a system that reports success on every claim while enforcing
nothing, with a fully green test suite. The platform mitigates this by refusing to grant when it cannot
see the index, but that is a backstop, not a substitute for running the migration.
