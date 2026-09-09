# Ringo — ETHOnline 2026 (Continuity Track)

Ringo turns a tweet into a real-money challenge: mention `@joinringo`, someone
takes the other side, and it settles in USDC on Polygon. Live since 2025.

> Ringo's public brand is a social challenge platform, never a "prediction
> market" — that construction is forbidden on any surface a crawler reads, per
> the branding doctrine in the webapp repo. `Market` stays the internal noun for
> an order-book position, which is why it appears throughout the schema and the
> code.

**Demo video:** [TODO: link after upload]

## Pre-existing vs built this week

|                                             |                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pre-existing (closed source, not submitted) | The X agent, the order book, USDC settlement through RingoManager, the production web app                                                                                                                                                                                                                     |
| Built during ETHOnline 2026                 | `subgraph/` — first index of Ringo's contracts on Polygon · this Next.js app — a public market index whose every figure is read from that subgraph · `worldid-gate/` — Selfie Check verification with a nullifier store · `subgraph/docs/queries.md` — the queries behind the agent's new `market_stats` tool |

Full disclosure of what predates the hackathon: [`docs/PRE-EXISTING.md`](docs/PRE-EXISTING.md).

## The two prizes

| Prize                                                | Requirement                                                                                                                              | Where it is met                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The Graph — Best AI Tooling (Continuity)             | Use The Graph as a load-bearing part of the project; do meaningful work with the data                                                    | `subgraph/` indexes RingoManager and USDC fee transfers. `subgraph/docs/queries.md` holds the queries the agent's `market_stats` tool answers from, plus the comparable-markets query behind the price suggestion. This app reads every figure it shows from the subgraph — no database fallback. |
| World — Selfie Check                                 | Uses Selfie Check, or a Selfie Check-compatible World ID credential flow, in a meaningful way; treats it as an abuse-prevention signal; shows a working app; feedback document | The claim requests the World ID 4.0 `selfie` credential against relying party `rp_fcf35b06aa54d927`, registered on-chain on production and staging. `worldid-gate/` verifies the proof against World and stores one nullifier per human; a unique index makes a second claim a no-op. Selfie Check is the abuse signal on a free credit: before this, one human with three accounts got three credits. Feedback in [`docs/FEEDBACK-world.md`](docs/FEEDBACK-world.md), including a documentation bug that silently breaks uniqueness. |

A third slot was assessed and deliberately left empty. AgentKit Continuity
requires using AgentKit and resolving agents through AgentBook, neither of which
this project does; the Bazantic fallback requires standing up an x402 gateway
plus a controlled A/B experiment plus a second video. Entering either would have
meant taking time from the two above in the last three days. Reasoning in
[`docs/decisions.md`](docs/decisions.md).

## Architecture

```
        a tweet
           │  reply: "@joinringo $5 on yes"
           ▼
   Ringo agent (private)  ──writes──▶  RingoManager on Polygon
           │                                   │
           │ reads                             │ events
           ▼                                   ▼
   market_stats tool  ◀────queries────  subgraph/  (The Graph Network)
                                               │
                                               ▼
                                      this app  (market index)

   claim flow (app repo) ──proof──▶  worldid-gate  ──▶  developer.world.org
                                          │
                                          └── nullifier store (one per human)
```

## Repository

One project. The Next.js app lives at the root; everything else is a folder
inside it.

| Path            | What it is                                                           |
| --------------- | -------------------------------------------------------------------- |
| `src/`          | The Next.js app — the public market index                            |
| `subgraph/`     | The subgraph. Start here: [`subgraph/README.md`](subgraph/README.md) |
| `worldid-gate/` | The verification service. Zero dependencies, 31 tests, fails closed  |
| `abi/`          | Contract ABIs                                                        |
| `docs/`         | Disclosure, AI use, decisions log, World feedback                    |

## Run it

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.example` already carries a working query URL, so this runs with no
further setup. The subgraph is public and the Studio endpoint takes no API key.

The gate is a second, independent service with nothing to install:

```bash
cd worldid-gate && npm test && node src/server.js
```

```bash
npm run typecheck   # tsc --noEmit, strict
npm run lint        # eslint
npm run build       # production build — does not touch the network
```

The subgraph is a nested npm project with its own dependencies, driven from
here:

```bash
npm run subgraph:install
npm run subgraph:start-block   # finds the creation block for subgraph.yaml
npm run subgraph:codegen
npm run subgraph:build
npm run subgraph:test
npm run subgraph:deploy
```

Two things the root config does on purpose: `tsconfig.json` and the ESLint
config both exclude `subgraph/`. Its `.ts` files are AssemblyScript — same
extension, different language — and compiling them with a TypeScript parser
fails on syntax that is correct where it lives.

## The app

One page, one job: show that the subgraph is load-bearing. Every figure is the
answer to a GraphQL query against `ringo-polygon`. If the subgraph is down, the
page says so rather than showing something stale.

```
src/
  app/
    page.tsx              the index, a server component behind Suspense
    error.tsx             what a judge sees when the subgraph is resyncing
    not-found.tsx, loading.tsx, layout.tsx, globals.css, icon.svg
  components/
    stats/                hero, KPI row, markets table, traders table, chart
    layout/, motion/, ui/, visual/
  lib/
    env.ts                server-only, fails fast naming the missing variable
    format.ts             USDC 6-decimal formatting in bigint
    subgraph/             client, queries and their types, aggregation
```

Decisions worth knowing before changing anything:

**The API key never reaches the browser.** `lib/subgraph/client.ts` and
`lib/env.ts` open with `import "server-only"`. Importing them from a client
component fails the build instead of shipping the key in a bundle.

**No client JavaScript for data.** The whole page is server components. There
is no query client and nothing to hydrate.

**Per-request rendering, cached data.** `dynamic = "force-dynamic"` plus
`next: { revalidate: 60 }` on the fetch. ISR would prerender at build time,
turning a deploy during a subgraph resync into a failed build.

**USDC math stays in bigint.** Amounts are raw 6-decimal integer strings.
`Number` loses precision past roughly nine billion units.

**`activeTraders` is never summed.** It is a daily distinct count. Adding it
across days counts a trader once per day they appeared.

The hero pairs the figures with the query that produced them — the number is
not typed into a slide, it is the answer to a request anyone can run against
the published subgraph. Blue is side A of a fill and crimson is side B, wherever
the two sides of a call appear — the key in the hero and the split in the markets
table. Nothing else borrows those two colours; a win and a loss are green and
grey, because a record is not a side.

## AI use

See [`docs/AI-USE.md`](docs/AI-USE.md).

## Reconciliation

Lifetime figures from the subgraph against Ringo's own KPIs, with any gap
explained: [`subgraph/README.md`](subgraph/README.md#reconciliation).

## Team

Facundo Mendez · Manuel Ferreras · Gonzalo Dominguez
