# Dashboard

A UI over the subgraph data.

## Where the code goes

This directory holds the dashboard.

## Why it matters for judging

The Graph prize asks for the subgraph to be load-bearing and for the project to do "meaningful work
with the data: reasoning, decisions, automation, or a natural-language interface". The agent covers the
reasoning and the natural-language interface; this package is the part a judge can open and click
through, which is the difference between a claim and a demonstration.

If it reads from the same three documents the agent uses, say so here: showing that the UI and the
agent share one data source is a stronger story than either alone.

## The queries

The three documents the agent sends are in [`../../docs/queries.md`](../../docs/queries.md), with the
field types they assume. Reusing them keeps one schema contract instead of two.

Worth knowing before you render any dollar figure: whether `volume` arrives denominated in whole USDC
or in raw 6-decimal base units is still open. See the note at the end of `queries.md`. If it is base
units, every figure needs dividing by 1e6, in the dashboard as much as in the agent.
