import { NextResponse } from "next/server";
import { SubgraphError, querySubgraph } from "@/lib/subgraph/client";
import {
  LIFETIME_QUERY,
  TOP_MARKETS_QUERY,
  TOP_TRADERS_QUERY,
} from "@/lib/subgraph/queries";

/**
 * Runs one of the queries this site displays, and hands back what the subgraph
 * answered.
 *
 * It exists so the page can offer a Run button next to the query it shows: a
 * reader who does not take our word for a figure can watch the request happen
 * and read the raw response. Without it, "anyone can run this" is a claim.
 *
 * Two things it deliberately is not.
 *
 * **Not a fetch from the browser.** The query URL and its key live behind
 * `server-only`; a Studio endpoint happens to need no key today, but the
 * gateway does once the subgraph is published, and a client-side fetch would
 * ship it in the bundle. Routing through here keeps that boundary intact no
 * matter which endpoint is configured.
 *
 * **Not a proxy for arbitrary GraphQL.** Only the three queries below can run,
 * selected by name — the request body never reaches the subgraph. An endpoint
 * that forwarded whatever it was handed would let anyone aim expensive queries
 * at our index, on our quota, from our origin.
 */
const RUNNABLE = {
  lifetime: { query: LIFETIME_QUERY, variables: { first: 1000 } },
  markets: { query: TOP_MARKETS_QUERY, variables: { first: 8 } },
  traders: { query: TOP_TRADERS_QUERY, variables: { first: 8 } },
} as const;

type QueryId = keyof typeof RUNNABLE;

function isQueryId(value: string | null): value is QueryId {
  return value !== null && Object.hasOwn(RUNNABLE, value);
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("q");

  if (!isQueryId(id)) {
    return NextResponse.json(
      { error: `Unknown query. Available: ${Object.keys(RUNNABLE).join(", ")}.` },
      { status: 400 }
    );
  }

  const { query, variables } = RUNNABLE[id];
  const startedAt = Date.now();

  try {
    const data = await querySubgraph<Record<string, unknown>>(query, variables);
    return NextResponse.json({ data, elapsedMs: Date.now() - startedAt });
  } catch (error) {
    // A subgraph answers 200 with an `errors` array for a bad query or a failed
    // handler mid-sync, and SubgraphError carries that text. Passing it through
    // is the point: mid-resync is exactly when a reader should see why a figure
    // is missing rather than a generic failure.
    const message =
      error instanceof SubgraphError
        ? error.message
        : "The subgraph could not be reached.";

    return NextResponse.json(
      { error: message, elapsedMs: Date.now() - startedAt },
      { status: 502 }
    );
  }
}
