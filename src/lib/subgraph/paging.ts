import {
  DEFAULT_LIMITS,
  MAX_LIMIT,
  PAGE_STEP,
  type StatsLimits,
} from "@/lib/subgraph/stats";

/**
 * The href that asks for the next batch of rows, or null at the end.
 *
 * The end is inferred, not counted: a subgraph has no total at query time, so
 * a response shorter than its limit is the only honest signal. That costs one
 * extra request at the bottom of a list; counting would cost a table scan on
 * every page.
 */
export function moreHref(
  key: keyof StatsLimits,
  limits: StatsLimits,
  received: number
): string | null {
  if (received < limits[key]) return null;
  if (limits[key] >= MAX_LIMIT) return null;

  const next: StatsLimits = {
    ...limits,
    [key]: Math.min(limits[key] + PAGE_STEP, MAX_LIMIT),
  };

  // Only non-default values reach the URL, so the first page stays a clean "/".
  const query = new URLSearchParams();
  if (next.markets !== DEFAULT_LIMITS.markets) {
    query.set("markets", String(next.markets));
  }
  if (next.traders !== DEFAULT_LIMITS.traders) {
    query.set("traders", String(next.traders));
  }

  return `/?${query.toString()}`;
}
