import { Card } from "@/components/ui/card";
import { Info } from "@/components/ui/info";
import {
  formatCount,
  formatDayLabel,
  formatRate,
  formatUsdc,
  formatUsdcCompact,
} from "@/lib/format";
import type { LifetimeTotals } from "@/lib/subgraph/stats";

export function KpiRow({ totals }: { totals: LifetimeTotals }) {
  // Deliberately not fees / volume: most indexed days carry fees against no
  // decodable fill, and that ratio reads several points too high.
  const feeRate = formatRate(totals.feesOnVolumeDays, totals.volume);
  const averageFill =
    totals.fills > 0
      ? `$${formatUsdc(totals.volume / BigInt(totals.fills), { decimals: 0 })} average`
      : "no fills yet";

  return (
    <dl
      aria-label="Lifetime totals"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
    >
      <Figure
        label="Settled volume"
        value={`$${formatUsdcCompact(totals.volume)}`}
        note={`across ${formatCount(totals.days)} indexed days`}
        hint="Both sides of every matched bet, added up. A $5 market with $5 against it counts as $10 staked, because that is what actually moved in USDC."
        accent
      />
      <Figure
        label="Fills"
        value={formatCount(totals.fills)}
        note={averageFill}
        hint="One fill is one matched bet: two people took opposite sides and the money is locked. An unmatched offer is not a fill and never reaches the chain."
      />
      <Figure
        label="Fees collected"
        value={`$${formatUsdcCompact(totals.fees)}`}
        note={
          feeRate
            ? `${feeRate} of volume on ${formatCount(totals.volumeDays)} days`
            : "no volume yet"
        }
        hint="USDC arriving at Ringo's fee addresses from outside; transfers between those two addresses are skipped, since they move one fee twice. The rate compares only the days that carry both fees and volume."
      />
      <Figure
        label="Traders that day"
        value={formatCount(totals.activeTradersToday)}
        note={
          totals.lastActiveDay
            ? `on ${formatDayLabel(totals.lastActiveDay)} UTC`
            : "no activity yet"
        }
        hint="Distinct addresses on the most recent day with activity. It is deliberately not summed across days: that would count one person once per day they showed up."
      />
      <Figure
        label="Days indexed"
        value={formatCount(totals.days)}
        note={`${formatCount(totals.volumeDays)} of them had a fill`}
        hint="Days the index wrote a row for, meaning anything happened — a fill or a fee arriving. Fewer of them carry volume, because fees are indexed from the start block while fills only exist from the block the current creation event starts firing at. Not calendar days since launch."
      />
    </dl>
  );
}

function Figure({
  label,
  value,
  note,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  note: string;
  hint?: React.ReactNode;
  accent?: boolean;
}) {
  // No `overflow-hidden`: it would clip the hint bubble. The accent rule
  // rounds its own top corners instead.
  return (
    <Card className="p-4">
      {accent ? (
        <span
          aria-hidden
          className="holo-line absolute inset-x-0 top-0 h-px rounded-t-xl"
        />
      ) : null}
      <dt className="text-[11px] font-medium tracking-[0.06em] text-faint uppercase sm:text-[12px]">
        {label}
        {hint ? <Info>{hint}</Info> : null}
      </dt>
      <dd
        className={`tnum mt-3 text-[24px] leading-none font-medium tracking-[-0.02em] sm:text-[27px] ${
          accent ? "holo-text" : "text-ink"
        }`}
      >
        {value}
      </dd>
      <p className="mt-2 text-[13px] text-muted">{note}</p>
    </Card>
  );
}
