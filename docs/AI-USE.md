# AI-use disclosure

ETHGlobal's [ETHOnline 2026 rules](https://ethglobal.com/events/ethonline2026/info/details)
require disclosure of where and how AI tools were used. This document covers
implementation, documentation and the submitted demo video. The boundary
between existing Ringo software and new work is in
[PRE-EXISTING.md](PRE-EXISTING.md).

## Implementation and human contributions

Both parts of this submission used AI coding assistance. Git authorship and
line counts do not establish whether a line was typed by a person or generated
by a tool, so we do not claim a percentage of human-written or AI-written code.

| Area | Human direction and work | AI assistance |
|---|---|---|
| `subgraph/`, contract ABI reconstruction, root Next.js stats app (`src/`) | Facundo Mendez led the implementation, investigated event signatures and indexed fields, made mapping and UI decisions, and deployed the index and app. | Facu reports using AI coding assistants to draft and iterate on code. His specific tools and per-line use are not recorded here. |
| `worldid-gate/` | Manuel Ferreras directed the credit-abuse use case, chose Selfie Check, reviewed behavior, and completed real-device verification. | Claude Code drafted the verification service and tests, investigated SDK/API behavior, and helped configure and validate the integration under Manuel's direction. |
| Subgraph and stats corrections | The team reviewed discrepancies against the chain and live data. | Claude Code helped investigate and implement the corrections in public PRs [#1](https://github.com/joinringo/ringo-ethonline-2026/pull/1) and [#2](https://github.com/joinringo/ringo-ethonline-2026/pull/2). |
| New integration in private Ringo repositories | Manuel directed the agent-data features and welcome-credit behavior and reviewed the work. | Claude Code assisted the subgraph client, agent tool and price hint, credit gate, and web claim flow. These private changes are disclosed in [PRE-EXISTING.md](PRE-EXISTING.md); their source is not in this public repo. |
| Submission documentation | The team supplied requirements, first-hand integration observations, product decisions and feedback. | Claude Code drafted documentation; Codex reconciled the final docs with the implementation, corrected stale claims and prepared submission copy. |

Human contributions included product scope, deciding which partner prizes to
enter, investigating and reviewing the contract interpretation, operating the
deployments, testing on a real phone, recording the demonstration, and deciding
what was ready to submit. AI assistance also included debugging, test writing,
code review and command execution. The team remains responsible for the result.

Historical AI co-author trailers are incomplete provenance. Their presence or
absence does not determine which files had AI assistance. We preserve the
commit history and disclose assistance here instead of inferring authorship
from trailers.

## Demo video

The desktop narration and phone screen recording were supplied by the team.
The voice and face are recorded human footage. Codex used FFmpeg to trim the
opening and ending, shorten one silent pause, align the phone recording with
the desktop verification transition, add a side overlay, and normalize audio.

The edit holds the immediately preceding dashboard frame over a brief desktop
app-switch and holds the phone's actual success frame after verification while
the desktop displays the credit result. It removes the phone dismissal
animation. Playback speed is unchanged. No generated voice, face or simulated
product result was added. Final duration is 3 minutes 50 seconds at 1080p.

## Requirements and review evidence

The public [integration contracts](INTEGRATION.md),
[query contracts](../subgraph/docs/queries.md), and [decision log](decisions.md)
record the requirements and decisions available in this repository. They are
not a verbatim prompt history. Work was directed through human instructions,
implementation review and observed behavior; this disclosure does not claim
that every planning conversation or prompt is included in the public repo.

The [World feedback](FEEDBACK-world.md) distinguishes completed production
World App verification from Sandbox onboarding attempts. It does not claim a
completed Sandbox proof. The video demonstrates Ringo's dev environment using
World's production verification flow; it does not demonstrate a production
Ringo credit grant.
