import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { QueryPanel } from "@/components/ui/query-panel";
import { formatRelativeDay } from "@/lib/format";
import type { LifetimeTotals } from "@/lib/subgraph/stats";

/**
 * The headline paired with the query that produced it. That pairing is the
 * argument the page exists to make: the number is not typed into a slide, it
 * is the answer to a query anyone can run.
 */
export function LifetimeHero({
  totals,
  query,
}: {
  totals: LifetimeTotals;
  query: string;
}) {
  return (
    /* `immediate`: this block is above the fold on every viewport. The spacing
       moved onto the wrappers — a margin on an animated child collapses through
       the transformed box it now sits in. */
    <RevealGroup
      as="section"
      immediate
      stagger={0.08}
      delay={0.06}
      className="grid gap-8 pb-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14"
    >
      <div>
        <RevealItem>
          <p className="font-label flex items-center gap-2 text-micro tracking-[0.1em] text-faint uppercase">
            <span
              aria-hidden
              className="live-dot h-1.5 w-1.5 rounded-full bg-resolved"
            />
            Live from the index
          </p>
        </RevealItem>

        <RevealItem className="mt-5">
          <h1 className="max-w-[20ch] text-[1.875rem] leading-[1.1] font-semibold tracking-[-0.02em] text-balance sm:text-[2.125rem] md:text-[2.875rem]">
            Every market Ringo has settled, read back out of the chain.
          </h1>
        </RevealItem>

        <RevealItem className="mt-5">
          <p className="max-w-[54ch] text-lead leading-relaxed text-muted">
            Markets open when someone replies to a tweet. Two people take
            opposite sides, USDC settles on Polygon, and a subgraph on The Graph
            Network indexes the result.
          </p>
        </RevealItem>

        <RevealItem className="mt-7">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-body text-faint">
            <SideKey color="bg-side-a" label="Side A · yes" />
            <SideKey color="bg-side-b" label="Side B · no" />
            <span aria-hidden className="hidden h-3 w-px bg-hairline sm:block" />
            <span>
              {totals.lastIndexedDay
                ? `Last indexed activity ${formatRelativeDay(totals.lastIndexedDay)}`
                : "No indexed activity yet"}
            </span>
          </div>
        </RevealItem>
      </div>

      {/* Last and from further down: the claim lands before its proof.
          `min-w-0` lets the track shrink under the query block's 562px of
          unwrappable GraphQL — without it the whole page had that floor. */}
      <RevealItem distance={22} className="min-w-0">
        <Card className="overflow-hidden">
          <QueryPanel
            queryId="lifetime"
            query={query}
            filename="lifetime.graphql"
            note="Every figure below and the chart under them come from this one request. Volume and fees are folded from the daily rows; active traders is a daily distinct count, so it is deliberately not summed."
          />
        </Card>
      </RevealItem>
    </RevealGroup>
  );
}

function SideKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={`h-2 w-2 rounded-[2px] ${color}`} />
      {label}
    </span>
  );
}
