# Ringo — ETHOnline 2026 submission

Continuity Track: new features on an existing social challenge platform.

## Links

- [Demo video — 3:50, 1080p](https://misc-file-hosting.s3.us-east-1.amazonaws.com/ringo/ethonline-2026/1d15ae4f26a94cbd9c47b4dfe8bf6538/Ringo-ETHOnline-2026-3m50.mp4)
- [Public repository](https://github.com/joinringo/ringo-ethonline-2026)
- [Live on-chain index](https://ethonline.joinringo.xyz)
- [World ID claim demo on Ringo dev](https://app-dev.joinringo.xyz/welcome-credit)
- [Pre-existing work](PRE-EXISTING.md)
- [AI-use disclosure](AI-USE.md)
- [World feedback](FEEDBACK-world.md)
- [Integration contracts](INTEGRATION.md)

The team reports uploading the video to ETHGlobal. This document does not
assert that the final dashboard submission or prize selections have been
confirmed; those are completed in the team's authenticated Hacker Dashboard.

## Project description

Ringo turns a tweet into a real-money challenge that settles in USDC on Polygon.
During ETHOnline we added a public index of Ringo's on-chain activity, a stats
app that reads from that index, an agent integration that uses historical
resolved claims for context, and a Selfie Check gate on the welcome credit.
The existing social agent, trading system and settlement contracts predate the
event. The new public components are the subgraph, stats app and verification
gate; integration changes in the existing private product are disclosed
separately.

## The Graph — Best AI Tooling or AI Use Case (Continuity)

The subgraph indexes live Polygon activity through Subgraph Studio. The stats
app reads its figures from GraphQL, and the existing Ringo agent uses the new
integration to answer position-stat questions and add historical context when
a challenge is created. Comparable claims are filtered by subject and
normalized before counting distinct outcomes. The demo shows the agent's
historical YES-rate reply, beyond merely displaying raw query results.

The [query contracts](../subgraph/docs/queries.md) document amounts, verdicts,
position-level scope, filtering and aggregation limits. We use Subgraph Studio;
we do not claim deployment to The Graph's decentralized network. The private
agent's source is not included in this public repository.

## World — Selfie Check

Selfie Check is a low-assurance abuse-prevention and eligibility signal for a
small welcome credit. The UI requests `selfieCheckLegacy()`. The gate accepts
only proof protocol 3.0 and requires the `selfie` credential in World's verified
response. The platform's unique nullifier and account keys prevent repeated
welcome grants within the fixed relying party/action/protocol namespace from
gate activation. This is not a claim of perfect identity assurance or a
retroactive deduplication of older grants.

The video shows a real phone verification and the credit result in Ringo dev,
using World's production verification service. A successful proof is separate
from credit eligibility: an already-paid or returning Ringo account can be
refused. Our feedback covers SDK integration, Developer Portal, Sandbox
onboarding difficulties, and documentation/debugging problems. No completed
Sandbox proof is claimed. We are not entering AgentKit.

## How to inspect and reproduce

1. Open the live index and compare its displayed data with the published
   [queries](../subgraph/docs/queries.md). Figures change as Polygon advances.
2. Follow the root README to run the stats app locally against the public
   Studio endpoint. Subgraph build instructions are in
   [subgraph/README.md](../subgraph/README.md).
3. Run `npm test` inside `worldid-gate/` for its local tests, which require no
   real proof or credentials. Running a live verification service additionally
   requires a World relying party and action; see
   [worldid-gate/README.md](../worldid-gate/README.md).
4. For the hosted claim flow, use an X-connected Ringo dev account and World
   App. Existing activity can make an account ineligible. The recorded demo
   shows the successful path; no shared credentials or credit-reset endpoint
   are provided.

The demo account's previous dev activity was temporarily backed up and reset
for filming so the first-time claim path could be shown. This was a controlled
demo preparation step, not a capability offered to ordinary users. The edited
video preserves normal playback speed and real results; its compositing and
holds are disclosed in [AI-USE.md](AI-USE.md).
