# How AI tools were used

ETHGlobal's rules do not ask for this. What they require disclosed is
pre-existing work, which is in [`PRE-EXISTING.md`](PRE-EXISTING.md) next to this
file. This document is here because the question comes up, and a specific answer
is more useful than a vague one.

## The proportions

Measured across the files currently in this repository, excluding lockfiles and
binaries:

| Author | Lines | Share |
|---|---|---|
| Facu Mendez | 7,243 | 77% |
| Written by an AI agent, committed under Manuel Ferreras | 2,193 | 23% |

So roughly three quarters of this submission was written by a person. The
subgraph, its mappings and tests, and the entire Next.js stats application are
Facu's, across 27 commits.

## Where the agent's 23% is

It is not spread thinly across the codebase. It sits in two places:

- **`worldid-gate/`**, the verification service, written in one pass with its
  own test suite. 1,209 lines.
- **`docs/`**, including this file.

Plus two bug-fix pull requests against Facu's subgraph and stats app
([#1](https://github.com/joinringo/ringo-ethonline-2026/pull/1),
[#2](https://github.com/joinringo/ringo-ethonline-2026/pull/2)), and the World ID
claim flow in the private `app.joinringo.xyz` repository.

Two of the seven commits under Manuel's identity carry a `Co-Authored-By: Claude`
trailer, `701fa89` and `3f17509`. The other five do not, because the project's
commit convention forbade the trailer until the last day of the hackathon. The
distinction is chronological, not a distinction between agent and human work,
and it is noted here so the trailers are not read as a map of authorship.

## What that work actually looked like

Not autocomplete, and not unsupervised either. Three examples of the loop, all
checkable in this repository:

- **Documentation was not trusted over shipped artifacts.** The World ID client
  API was pinned by reading installed type definitions and, for two hostnames, by
  extracting strings from a compiled WASM binary. That caught a live
  documentation bug: the published personhood example uses a v3-only preset,
  which would have broken the uniqueness guarantee silently. Written up in
  [`FEEDBACK-world.md`](FEEDBACK-world.md).
- **The diff was audited before it was proposed.** Review passes over the claim
  flow found three high-severity defects before it was opened for review,
  including one where the error copy told a user to sign in again and the retry
  path would then have credited the second account with the first person's
  nullifier.
- **Assumptions were checked against reality.** Five claims written into the
  original plan turned out to be wrong once the subgraph was live and queryable,
  including what `Market.outcome` contains. Each correction is in
  [`decisions.md`](decisions.md).

## Who decided things

Every product and prize decision was Manuel's: which World credential to
request, Selfie Check rather than orb personhood, whether to publish to The
Graph Network, whether to attempt a third prize slot, and what to cut when time
ran short. He ran the commands the agent could not run and reversed its
direction more than once.

## Facu's half

The subgraph and the stats app are his, across 27 commits.

Facu reports using AI coding assistants to write code, which is the same
category of use described above: drafting and iterating on implementation. The
work that decided how the subgraph behaves is his own and is visible in
`decisions.md`, where the ABI was recovered from mainnet bytecode after the
private ABI never arrived, and where three of four guesses about which event
parameters were indexed turned out to be wrong. Deploying the guess would have
decoded every amount one word off.

## The short version of all of it

Both halves of this repository were written with AI assistance. A person
directed it, reviewed it, and made every decision that mattered, and roughly
three quarters of the lines were typed by Facu rather than generated. We would
rather say that plainly than let a reader infer it from the commit log.
