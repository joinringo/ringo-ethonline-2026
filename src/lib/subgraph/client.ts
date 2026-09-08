import "server-only";
import { serverEnv } from "@/lib/env";

/**
 * `server-only` above is load-bearing. If someone later imports this module
 * from a client component, the build fails with a clear error instead of
 * shipping SUBGRAPH_API_KEY inside the JavaScript bundle.
 */

type GraphQLError = { message: string };

type GraphQLResponse<T> = {
  data?: T;
  errors?: GraphQLError[];
};

export class SubgraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubgraphError";
  }
}

type QueryOptions = {
  /** Seconds before the cached response is considered stale. */
  revalidate?: number;
};

export async function querySubgraph<TData>(
  query: string,
  variables: Record<string, unknown> = {},
  options: QueryOptions = {}
): Promise<TData> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const apiKey = serverEnv.subgraphApiKey;
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const response = await fetch(serverEnv.subgraphUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    next: { revalidate: options.revalidate ?? 60 },
  });

  if (!response.ok) {
    throw new SubgraphError(
      `Subgraph returned ${response.status} ${response.statusText}`
    );
  }

  const payload = (await response.json()) as GraphQLResponse<TData>;

  // A subgraph answers 200 with an `errors` array for a bad query or a failed
  // handler mid-sync, so status alone is not enough to know the read worked.
  if (payload.errors && payload.errors.length > 0) {
    throw new SubgraphError(
      payload.errors.map((error) => error.message).join("; ")
    );
  }
  if (!payload.data) {
    throw new SubgraphError("Subgraph returned no data");
  }

  return payload.data;
}
