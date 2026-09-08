import { Card, SectionHead } from "@/components/ui/card";
import { formatCount, formatDayLabel, formatUsdc } from "@/lib/format";
import type { DailyPoint } from "@/lib/subgraph/stats";

/**
 * A total says how much; only the shape says whether it arrived steadily or in
 * one afternoon, which is the question a market index actually raises.
 */
export function ActivityChart({ series }: { series: DailyPoint[] }) {
  const first = series[0];
  const last = series[series.length - 1];
  if (!first || !last) return null;

  const peak = series.reduce(
    (max, point) => (point.volume > max ? point.volume : max),
    0n
  );
  const active = series.filter((point) => point.fills > 0).length;

  return (
    <Card>
      <SectionHead
        title="Daily settled volume"
        note={`Last ${series.length} days ending on the most recent indexed day. ${active} of them had a fill.`}
        aside={
          <p className="tnum text-right text-[13px] text-muted">
            Peak{" "}
            <span className="font-medium text-ink">
              ${formatUsdc(peak, { decimals: 0 })}
            </span>
          </p>
        }
      />

      <div className="px-5 py-5">
        <div
          role="img"
          aria-label={`Daily settled volume over the last ${series.length} indexed days, peaking at ${formatUsdc(peak, { decimals: 0 })} USDC.`}
          className="flex h-[104px] items-end gap-[2px] sm:h-[128px] sm:gap-[3px]"
        >
          {series.map((point, index) => (
            <Bar
              key={point.date}
              point={point}
              peak={peak}
              align={
                index < 4
                  ? "left"
                  : index > series.length - 5
                    ? "right"
                    : "center"
              }
            />
          ))}
        </div>

        <div className="mt-3 flex justify-between text-[11px] text-faint">
          <span>{formatDayLabel(first.date)}</span>
          <span>{formatDayLabel(last.date)}</span>
        </div>
      </div>
    </Card>
  );
}

const TOOLTIP_ALIGN = {
  left: "left-0",
  right: "right-0",
  center: "left-1/2 -translate-x-1/2",
} as const;

function Bar({
  point,
  peak,
  align,
}: {
  point: DailyPoint;
  peak: bigint;
  align: keyof typeof TOOLTIP_ALIGN;
}) {
  // Two floors saying opposite things: a day with volume never renders as a
  // hairline the eye reads as zero, and a day without one gets a 2px tick —
  // enough to show the day exists, too little to read as a quantity.
  const ratio = peak > 0n ? Number((point.volume * 1000n) / peak) / 1000 : 0;
  const height = point.volume > 0n ? `${Math.max(ratio * 100, 4)}%` : "2px";

  return (
    <div className="group relative flex h-full flex-1 items-end">
      <div
        style={{ height }}
        className={`w-full rounded-[2px] transition-colors duration-150 ${
          point.volume > 0n
            ? "bg-gradient-to-t from-holo/40 to-holo group-hover:from-holo/65 group-hover:to-holo"
            : "bg-hairline group-hover:bg-muted"
        }`}
      />

      <div
        className={`pointer-events-none absolute bottom-full z-20 mb-2 hidden w-max rounded-lg border border-hairline bg-overlay px-3 py-2 shadow-lg shadow-black/40 group-hover:block ${TOOLTIP_ALIGN[align]}`}
      >
        {/* muted, not faint: this bubble sits on --color-overlay, the lightest
            surface on the page, where faint drops to 4.2:1. */}
        <p className="text-[11px] text-muted">
          {formatDayLabel(point.date)} UTC
        </p>
        <p className="tnum mt-1 text-[13px] font-medium">
          ${formatUsdc(point.volume, { decimals: 0 })}
        </p>
        <p className="tnum text-[12px] text-muted">
          {formatCount(point.fills)} fills · {formatCount(point.activeTraders)}{" "}
          traders
        </p>
      </div>
    </div>
  );
}
