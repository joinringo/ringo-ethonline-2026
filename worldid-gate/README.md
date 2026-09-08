# worldid-gate

Not built yet. This file records the contract the web app already codes
against, so the service and the frontend cannot drift.

`web/` never calls this service directly — it proxies through
`/api/world/rp-signature` and `/api/world/verify` so the gate URL stays
server-side.

## POST /rp-signature

Returns the signed RP context. No request body.

```json
{
  "rp_id": "rp_...",
  "nonce": "...",
  "created_at": 1757116800,
  "expires_at": 1757117100,
  "sig": "0x..."
}
```

Note `sig`. IDKit's `RpContext` type calls the same field `signature`; the web
app adapts in `src/lib/world/proof.ts` rather than making the gate lie about
its own wire format.

## POST /verify

Body: `{ "result": <IDKit result, untouched>, "accountId": "..." }`.

Forwards the payload unchanged to
`https://developer.world.org/api/v4/verify/{rp_id}`. On success, stores the
nullifier with a unique index and returns `{ "ok": true, "nullifier": "..." }`.

When the nullifier is already stored, return
`{ "ok": false, "error": "already_claimed" }` — the web app has a dedicated
screen for that case, and it is the one the demo video shows.

**Nullifier format — decimal, canonicalised.** Settled with the backend: 1 to
78 digits, decimal, leading zeros stripped before storage.

IDKit v4 hands back hex under `result.responses[i].nullifier` — note that
`nullifier_hash` is the v3 name and does not exist in v4. The conversion
happens here, on write.

Both halves of that matter. The backend rejects hex with a 400. And without
stripping leading zeros, `"123"` and `"0123"` are distinct keys in a unique
index, so one person can claim once per zero they prepend.

## GET /status?nullifier=

Returns `{ "verified": boolean }`. Ringo's backend calls this before granting
the credit — the credit must never be granted on the word of the browser.

The backend's contract here is strict, and deliberately so. It accepts only a
literal JSON `true`. The string `"true"`, a `1`, a `"yes"`, an HTML body, a
redirect, any status other than 200, or a response slower than 3 seconds all
mean *not verified* and grant nothing. It does not follow redirects.

So: return a real JSON boolean, and never redirect. A framework that helpfully
301s `/status` to `/status/` turns every verification into a silent denial.

## Environment

`APP_ID`, `RP_ID`, `RP_SIGNING_KEY`, `DB_URL`. The signing key never enters
this repository.
