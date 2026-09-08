# worldid-gate

Verifies a World ID proof and answers exactly one question for the Ringo
platform: **has this human been verified?**

Ringo gives every new user a small credit to place their first prediction. That
credit was idempotent per **account**, which on X means one person with five
handles could collect it five times. This service is what makes it one per
person instead.

## What it is not

It is **not** the one-credit-per-human fence. That fence is a unique index on
`welcome_bonus_verifications.nullifier` in the platform's own database, created
by an explicit migration, and it is the only thing that can win a race between
two simultaneous claims.

This distinction is deliberate. If this service held the fence it would be a
single point of failure for a payment decision, and an operator restoring it
from a backup would silently re-enable claims for everybody. So the platform
asks this service "is this person verified?" and asks its own index "has this
person already been paid?" Two questions, two owners.

## The contract

Three endpoints. **The platform calls only the first one.**

### `GET /status?nullifier=<decimal or 0x-hex>`

```json
200 { "verified": true }
200 { "verified": false }
```

Only the **literal boolean `true`** counts as verified. Every one of the
following means "not verified" and grants nothing, because the platform fails
closed:

| Response | Result |
|---|---|
| `{ "verified": "true" }` (string) | not verified |
| `{ "verified": 1 }` | not verified |
| `{}` or a missing field | not verified |
| a `200` with an HTML body | not verified |
| any status other than `200` | not verified |
| a `3xx` redirect | not verified, and not followed |
| a timeout | not verified |

This service never redirects, and the platform sets `maxRedirects: 0`
deliberately: a redirect to a host that happened to serve `{"verified":true}`
would otherwise be read as this service's own answer on a call that authorises
a payment.

A malformed nullifier gets a `400` whose body still says
`{"verified": false}`, so a caller that reads only the status and a caller that
reads only the body both reach the right conclusion. It is loud on purpose: a
quiet `false` would hide an integration bug as "this human is unknown".

### `POST /verify`

Called by the claim UI, never by the platform. Forward the IDKit result payload
**as-is**, with no field remapping. It goes to
`POST https://developer.world.org/api/v4/verify/{rp_id}`.

```json
200 { "verified": true, "nullifier": "123…", "first_time": true }
400 { "verified": false, "reason": "rejected" }
502 { "verified": false, "reason": "unreachable" }
```

The nullifier this service records is the one in **World's response**, never the
one in the client's payload. A client controls its own request body; it does not
control what World says back. Recording the client's copy would let anyone
register any nullifier they liked.

### `POST /rp-signature`

Returns `501`. See "The one thing this does not do".

## Two traps worth knowing

### Nullifiers must be canonicalized, or the fence is free to bypass

IDKit returns the nullifier as `0x`-prefixed hex. The platform's claim endpoint
accepts **decimal only** and rejects hex with a `400`. Same number, two
spellings, so one side has to convert, and it converts here because this is the
only component that ever sees an IDKit payload.

Worse, leading zeros matter:

```
"123"     -> "123"
"0123"    -> "123"
"000123"  -> "123"
"0"       -> rejected, not a real field element
```

`"123"` and `"0123"` are **distinct keys** in a unique index. That was verified
against a real database, not assumed. Without stripping leading zeros a person
could claim once per zero they added, up to the field width.

`src/nullifier.js` is the single definition of "the same human" and it has to
agree exactly with the platform's `canonicalizeNullifier`. If the two ever
disagree, the platform's index stops colliding for a person this service
considers already seen, and that person is paid twice.

> Changing this normalization after rows exist is not a code-only change. Rows
> written under the old spelling stop colliding with the new one, and every
> already-verified person could claim again.

### Legacy proofs give one person two nullifiers

`selfieCheckLegacy` is a **v3 preset**, and `allow_legacy_proofs: true` lets
World App satisfy the request with a v3 proof. A v3 proof and a v4 proof for the
**same person** carry **different nullifiers**, and no index can connect them.
Turn that on and one human claims the credit twice while every uniqueness check
reports success.

So this service **refuses `protocol_version: "3.0"` by default**. Setting
`GATE_ALLOW_LEGACY_PROOFS=true` re-enables it and logs a warning at boot saying
exactly what you have just given up. If the claim UI uses a legacy preset, that
is the decision to revisit, not this flag.

## Run it

No dependencies to install. `node:sqlite` and `node:test` ship with Node 22.

```bash
cd worldid-gate
cp .env.example .env        # fill WORLDID_RP_ID and WORLDID_ACTION
node --env-file=.env src/server.js
```

```bash
npm test                    # 31 tests, no network
```

`GET /status` works with an empty database from the first request: it answers
`{"verified": false}`, which is the correct answer for a human nobody has
verified yet. That means the platform can be pointed at this service before the
claim UI exists.

## The one thing this does not do

`POST /rp-signature` returns `501` on purpose.

The RP signature is secp256k1 ECDSA over keccak256, and the signing key is what
lets anyone forge a request from this app. Hand-rolling the signing of an
identity request is the wrong call, so that endpoint wants the vendor's signer,
`SignRequest` from `@worldcoin/idkit-server`, rather than an implementation
written here. Whoever builds the claim UI should call it there, with the key read
from a secrets store at runtime and never from a plain environment variable.

The RP signing key is not read by this service and must never be added to its
environment.

## Layout

```
src/nullifier.js   canonicalization. The definition of "the same human"
src/store.js       verified-nullifier store, node:sqlite, PRIMARY KEY as the index
src/world.js       the v4 verify call. Fails closed on everything unexpected
src/config.js      environment, read once at boot
src/server.js      the three endpoints
test/              31 tests: canonicalization, the store, the /status wire
                   contract, and every fail-closed path. No network.
```

## Environment

Names only. Values are per environment and never committed.

| Variable | Default | Purpose |
|---|---|---|
| `WORLDID_RP_ID` | none | Relying-party id from the Developer Portal. Required by `/verify` |
| `WORLDID_ACTION` | none | The action a proof must be bound to. A proof for another action is refused |
| `WORLDID_VERIFY_BASE_URL` | `https://developer.world.org/api/v4/verify` | v4 lives on `world.org`, not `worldcoin.org` |
| `WORLDID_VERIFY_TIMEOUT_MS` | `8000` | |
| `GATE_PORT` | `8787` | |
| `GATE_DB_PATH` | `./data/nullifiers.db` | |
| `GATE_ALLOW_LEGACY_PROOFS` | unset | Leave unset. See the trap above |

Strict equality against the string `"true"`. `"TRUE"`, `"1"` and `"yes"` all
mean off, deliberately: an ambiguous value across environments must not
half-enable something that moves money.
