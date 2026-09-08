# Ringo — ETHOnline 2026 (Continuity Track)

Ringo opens a real-money prediction market under any tweet: mention
`@joinringo` and a market appears with its own order book, settled in USDC on
Polygon. Live since 2025.

**Demo video:** [TODO: link after upload]

## Pre-existing vs built this week

|                                             |                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pre-existing (closed source, not submitted) | The X agent, the order book, USDC settlement through RingoManager, the production web app                                                                                                                                                                                                                     |
| Built during ETHOnline 2026                 | `subgraph/` — first index of Ringo's contracts on Polygon · this Next.js app — a public market index whose every figure is read from that subgraph · `worldid-gate/` — Selfie Check verification with a nullifier store · `subgraph/docs/queries.md` — the queries behind the agent's new `market_stats` tool |

Full disclosure of what predates the hackathon: [`docs/PRE-EXISTING.md`](docs/PRE-EXISTING.md).

## The three prizes

| Prize                                                | Requirement                                                                                                                              | Where it is met                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The Graph — Best AI Tooling (Continuity)             | Use The Graph as a load-bearing part of the project; do meaningful work with the data                                                    | `subgraph/` indexes RingoManager and USDC fee transfers. `subgraph/docs/queries.md` holds the queries the agent's `market_stats` tool answers from, plus the comparable-markets query behind the price suggestion. This app reads every figure it shows from the subgraph — no database fallback. |
| World — Selfie Check                                 | Uses a Selfie Check credential flow in a meaningful way; treats it as an abuse-prevention signal; shows a working app; feedback document | `worldid-gate/` verifies the proof and stores one nullifier per human. The user-facing claim flow lives in the private app.joinringo.xyz repo, per the field manual; feedback in `docs/FEEDBACK-world.md`. One credit per human, not per X account.                                               |
| World — AgentKit Continuity _(or Bazantic fallback)_ | [TODO: decide — see `docs/decisions.md`]                                                                                                 | [TODO]                                                                                                                                                                                                                                                                                            |

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
| `worldid-gate/` | The verification service. Contract documented, not yet built         |
| `abi/`          | Contract ABIs                                                        |
| `docs/`         | Disclosure, AI use, decisions log, World feedback                    |

## Run it

```bash
npm install
cp .env.example .env.local   # fill SUBGRAPH_URL
npm run dev
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
    stats-sections.tsx    hero, markets table, traders table — server-rendered
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
the two sides of a bet appear — the key in the hero and the split in the markets
table. Nothing else borrows those two colours; a win and a loss are green and
grey, because a record is not a side.

## AI use

See [`docs/AI-USE.md`](docs/AI-USE.md).

## Reconciliation

Lifetime figures from the subgraph against Ringo's own KPIs, with any gap
explained: [`subgraph/README.md`](subgraph/README.md#reconciliation).

## Team

Facundo Mendez · Manuel Ferreras · Gonzalo Dominguez
