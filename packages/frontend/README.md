# Claim flow

The user-facing flow: prove personhood with World ID, then claim the welcome credit.

## Where the code goes

This directory holds the frontend for the claim flow.

## The flow

1. User arrives authenticated with their social account (an existing Ringo session).
2. Run the IDKit flow. Obtain the proof and the nullifier.
3. Send the proof to the gate: `POST /verify` on `worldid-gate`.
4. Call the platform: `POST /welcome-bonus/claim` with the nullifier and the user's session token.
5. Render the outcome.

## Handling the response

Five outcomes, and two of them are commonly mistaken for errors. The full table is in
[`../../docs/INTEGRATION.md`](../../docs/INTEGRATION.md).

| Outcome | Not an error |
|---|---|
| `already_claimed` | This person already received the credit, possibly on another of their accounts. This is the feature working. |
| `disabled` | The gate is switched off in this environment. **On staging before the flag is enabled, this is what you will get.** |

Plus `granted`, `verification_required`, and the status codes `401`, `422` and `429`.

## Two constraints to design around

- **X accounts only for now.** A session authenticated through Kick receives a `422`.
- **The `422` also fires** when the identity provider does not supply a stable numeric account id. The
  platform refuses rather than falling back to a rename-mutable handle.

## The nullifier format

Send it as a **decimal** string. IDKit gives you `nullifier_hash` in `0x` hex; the platform rejects hex
with a `400`. Whichever form is chosen, the gate and the frontend have to use the same one.
