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
    <section className="rise grid gap-8 pb-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
      <div>
        <p className="flex items-center gap-2 text-[12px] font-medium tracking-[0.14em] text-faint uppercase">
          <span
            aria-hidden
            className="live-dot h-1.5 w-1.5 rounded-full bg-resolved"
          />
          Live from the index
        </p>

        <h1 className="mt-5 max-w-[20ch] text-[30px] leading-[1.1] font-semibold tracking-[-0.02em] text-balance sm:text-[34px] md:text-[46px]">
          Every market Ringo has settled, read back out of the chain.
        </h1>

        <p className="mt-5 max-w-[54ch] text-[15px] leading-relaxed text-muted">
          Markets open when someone replies to a tweet. Two people take opposite
          sides, USDC settles on Polygon, and a subgraph on The Graph Network
          indexes the result.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-faint">
          <SideKey color="bg-side-a" label="Side A" />
          <SideKey color="bg-side-b" label="Side B" />
          <span aria-hidden className="hidden h-3 w-px bg-hairline sm:block" />
          <span>
            {totals.lastActiveDay
              ? `Last indexed activity ${formatRelativeDay(totals.lastActiveDay)}`
              : "No indexed activity yet"}
          </span>
        </div>
      </div>

      <Card className="overflow-hidden">
        <QueryPanel
          queryId="lifetime"
          query={query}
          filename="lifetime.graphql"
          note="Every figure below and the chart under them come from this one request. Volume and fees are folded from the daily rows; active traders is a daily distinct count, so it is deliberately not summed."
        />
      </Card>
    </section>
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
