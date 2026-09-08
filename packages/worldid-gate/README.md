# worldid-gate

A standalone service that verifies an IDKit proof against World and records the nullifier. It exists so
the Ringo platform never handles a proof and has no World ID dependency of its own.

## Where the code goes

This directory holds the service: its HTTP handlers, its World verification call and its nullifier
store.

## Endpoints

| Endpoint | Called by | Purpose |
|---|---|---|
| `POST /rp-signature` | frontend | Whatever the IDKit flow requires before verification |
| `POST /verify` | frontend | Verify the proof against World, record the nullifier |
| `GET /status?nullifier=` | **the platform** | The only endpoint the platform ever calls |

## The one contract that must not drift

```http
GET /status?nullifier=<decimal string>
```

```json
200 { "verified": true }
```

The platform treats **only the literal boolean `true`** as verified. The string `"true"`, a `1`, a
`"yes"`, a `200` with an HTML body, any non-200, any redirect and any timeout all mean "not verified"
and no credit is granted. Redirects are not followed.

So: return a real JSON boolean, and do not redirect.

The nullifier is a **decimal** string, 1 to 78 digits, not the `0x` hex form IDKit hands you. See
[`../../docs/INTEGRATION.md`](../../docs/INTEGRATION.md) for why that distinction matters and what
happens if the two sides disagree.

## Failing closed is the requirement

This service's answer authorizes a payment. If it cannot reach World, cannot parse a response, or is
uncertain for any reason, it must answer `{ "verified": false }` rather than erroring in a way the
caller might interpret as success. A gate that fails open is decoration.
