import { Suspense } from "react";
import {
  ActivityChart,
  KpiRow,
  LifetimeHero,
  MarketsTable,
  StatsSkeleton,
  TradersTable,
} from "@/components/stats";
import { moreHref } from "@/lib/subgraph/paging";
import { LIFETIME_QUERY } from "@/lib/subgraph/queries";
import {
  DEFAULT_LIMITS,
  getStatsPageData,
  parseLimit,
  type StatsLimits,
} from "@/lib/subgraph/stats";

/**
 * Per request, with the subgraph response cached for 60s in the data cache.
 *
 * Not ISR: prerendering at build time means a deploy that lands while the
 * subgraph is syncing fails the whole build. A stats page should degrade to an
 * error message, not block a release.
 */
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function StatsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const limits: StatsLimits = {
    markets: parseLimit(params.markets, DEFAULT_LIMITS.markets),
    traders: parseLimit(params.traders, DEFAULT_LIMITS.traders),
  };

  return (
    <main className="mx-auto max-w-[76rem] px-5 pt-12 pb-4 sm:px-6 sm:pt-16">
      {/* No key on the boundary, deliberately. Keyed on the limits, every
          "show more" was a fresh mount: React tore down the hero, the chart and
          both tables, put the full-page skeleton in their place, and the reader
          lost the rows they were reading to gain twenty more. Left unkeyed, the
          boundary stays resolved, React holds the rendered page on screen until
          the next payload lands and then reconciles the new rows in — the rows
          already there never unmount, so they neither blank nor replay their
          reveal. Feedback for the click belongs on the control that was
          clicked, and lives in components/ui/show-more. */}
      <Suspense fallback={<StatsSkeleton />}>
        <Stats limits={limits} />
      </Suspense>
    </main>
  );
}

async function Stats({ limits }: { limits: StatsLimits }) {
  const { totals, series, markets, traders, verdicts } =
    await getStatsPageData(limits);

  return (
    // The ids are the header's anchors and the targets it tracks to mark the
    // active link — see components/layout/site-header.
    <div className="flex flex-col gap-10">
      <div id="overview" className="flex flex-col gap-10">
        <LifetimeHero totals={totals} query={LIFETIME_QUERY} />
        <KpiRow totals={totals} verdicts={verdicts} />
      </div>
      <div id="activity">
        <ActivityChart series={series} />
      </div>
      <div id="markets">
        <MarketsTable
          markets={markets}
          moreHref={moreHref("markets", limits, markets.length)}
        />
      </div>
      <div id="traders">
        <TradersTable
          traders={traders}
          moreHref={moreHref("traders", limits, traders.length)}
        />
      </div>
    </div>
  );
}
