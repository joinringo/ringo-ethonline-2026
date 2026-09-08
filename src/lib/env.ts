import "server-only";

/**
 * Reads server-side configuration once, at first use, and fails with a message
 * that names the missing variable.
 *
 * The alternative — reading process.env at the call site — turns a missing
 * variable into a 500 halfway through a demo, with a stack trace that points at
 * a fetch instead of at the deploy that forgot the key.
 */
function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example.`
    );
  }
  return value;
}

function optional(name: string): string | null {
  const value = process.env[name];
  return value === undefined || value.trim() === "" ? null : value;
}

export const serverEnv = {
  get subgraphUrl() {
    return required("SUBGRAPH_URL");
  },
  /** Studio subgraphs are readable without a key; the network gateway is not. */
  get subgraphApiKey() {
    return optional("SUBGRAPH_API_KEY");
  },
} as const;
