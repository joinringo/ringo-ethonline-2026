# Feedback for World

Required by both World tracks. Written as we went, not reconstructed at the end.

## Selfie Check: docs and integration

[TODO: Facu]

Already worth reporting: the integration snippets circulating for this flow
show an `IDKitWidget` component with `app_id`, `action` and `signal` as props.
That component does not exist in `@worldcoin/idkit` v4. The current API is
`IDKitRequestWidget` / `useIDKitRequest`, with the signal moving inside a
preset — `selfieCheckLegacy({ signal })`. Anyone following an older guide hits
a missing export before they hit anything else.

Second: `RpContext` expects a field named `signature`, while the RP signing
example returns it as `sig`. Small, but it costs a debugging session because
the failure surfaces as a rejected proof rather than a type error.

## Developer Portal navigation

[TODO: Facu]

## Testing with the Sandbox app

[TODO: Facu]

## Confusing, missing or broken

[TODO: Facu]
