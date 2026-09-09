# How AI tools were used

ETHGlobal asks for this disclosure, and the useful version of it is specific
rather than reassuring. What follows is what actually happened, with commit
hashes so it can be checked against `git log` rather than taken on trust.

## The short version

A large share of this repository was written by an AI coding agent (Claude
Code), not by a human typing. Every line was reviewed, run and tested before it
was committed, and the design decisions it encodes were argued through rather
than accepted, but the drafting was the agent's.

## What the agent wrote

All seven commits under the git identity `Manuel Ferreras` were authored by the
agent working in Manuel's terminal:

| Commit | What |
|---|---|
| `5544a47` | Monorepo scaffold, integration contracts, verified data source |
| `0e335af` | Dashboard package scaffold |
| `552ada2` | **The whole of `worldid-gate/`**: 1,038 lines, the service, its store, its nullifier canonicalisation and its test suite |
| `ec0d5e9` | Corrections to three claims in the docs that a judge would have found by clicking |
| `cf29f74` | The backend half of `FEEDBACK-world.md` |
| `701fa89` | Credential observation in the gate, and the decisions log |
| `3f17509` | The gate's container image |

Also agent-authored: the two open pull requests, [#1](https://github.com/joinringo/ringo-ethonline-2026/pull/1)
(the subgraph fee figure and the phantom win counters) and
[#2](https://github.com/joinringo/ringo-ethonline-2026/pull/2) (the dashboard's
"traders that day" figure), and the World ID claim flow that lives in the
private `app.joinringo.xyz` repository and is described in
[`INTEGRATION.md`](INTEGRATION.md).

**Only two of those seven commits carry a `Co-Authored-By: Claude` trailer**,
`701fa89` and `3f17509`. That is not a distinction between agent and human work.
The project's commit convention forbade the trailer for most of the hackathon
and was changed on the last day. A judge comparing trailers against authorship
would otherwise be misled, so it is stated here instead.

## What the agent did that was not writing code

Three things worth naming, because they are the part that actually mattered:

- **It read shipped artifacts instead of documentation.** The World ID client
  API was pinned by reading the installed `.d.ts` files and, for two hostnames,
  by extracting strings from the compiled `idkit_wasm_bg.wasm`. This caught a
  live documentation bug: `docs.world.org` still shows `orbLegacy` for the
  personhood example, which is a v3-only preset. Following the docs would have
  broken the uniqueness guarantee silently. See
  [`FEEDBACK-world.md`](FEEDBACK-world.md).
- **It audited its own diff before opening a PR.** Separate review passes over
  the claim flow found three high-severity defects, including one where the
  error copy told a user to sign in again and the retry path would then have
  credited the *second* account with the first person's nullifier. That was the
  agent's own bug, found by the agent, fixed before review.
- **It checked claims against reality rather than restating them.** Five
  assumptions written into the original plan turned out to be wrong once the
  subgraph was live and queryable, including what `Market.outcome` contains and
  whether `tags` is ever populated. The decisions log records each correction.

## What a human did

Manuel made every product and prize decision: which credential to request, that
Selfie Check should be used rather than orb personhood, whether to publish to
The Graph Network, whether to attempt a third prize slot. He ran the commands
the agent could not run itself, and he stopped work that was heading the wrong
way more than once.

## Facu's half

The `subgraph/` mappings and the Next.js stats application at the repository
root are Facu Mendez's 27 commits. **Whether and how AI tools were used there is
his to state, and this document does not speak for him.**

[TODO: Facu — add your paragraph here before submission.]
