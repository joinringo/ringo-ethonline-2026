import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
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
        <div className="flex items-center justify-between gap-3 border-b border-hairline bg-raised/40 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span aria-hidden className="flex shrink-0 gap-1.5">
              <Dot className="bg-side-b/70" />
              <Dot className="bg-mark/70" />
              <Dot className="bg-resolved/70" />
            </span>
            <p className="ml-1 truncate font-mono text-[12px] text-muted">
              lifetime.graphql
            </p>
          </div>
          <CopyButton value={query.trim()} label="Copy query" />
        </div>

        <pre className="overflow-x-auto px-4 py-4 font-mono text-[12px] leading-[1.75] text-ink/90">
          <code>{query.trim()}</code>
        </pre>

        <p className="border-t border-hairline px-4 py-3 text-[12.5px] leading-relaxed text-faint">
          Volume and fees are folded from daily rows. Active traders is a daily
          distinct count, so it is deliberately not summed.
        </p>
      </Card>
    </section>
  );
}

function Dot({ className }: { className: string }) {
  return <span className={`h-2 w-2 rounded-full ${className}`} />;
}

function SideKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={`h-2 w-2 rounded-[2px] ${color}`} />
      {label}
    </span>
  );
}
