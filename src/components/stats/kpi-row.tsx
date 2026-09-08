import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { Info } from "@/components/ui/info";
import {
  formatCount,
  formatDayLabel,
  formatRate,
  formatUsdc,
  formatUsdcCompact,
} from "@/lib/format";
import type { ClaimVerdicts, LifetimeTotals } from "@/lib/subgraph/stats";

export function KpiRow({
  totals,
  verdicts,
}: {
  totals: LifetimeTotals;
  verdicts: ClaimVerdicts;
}) {
  // Only the resolutions that carry a verdict are the denominator. Folding the
  // unknown ones in either direction would answer a question the chain did not.
  const settled = verdicts.held + verdicts.broken;
  const heldShare =
    settled > 0 ? `${Math.round((verdicts.held / settled) * 100)}%` : null;

  // Deliberately not fees / volume: most indexed days carry fees against no
  // decodable fill, and that ratio reads several points too high.
  const feeRate = formatRate(totals.feesOnVolumeDays, totals.volume);
  const averageFill =
    totals.fills > 0
      ? `$${formatUsdc(totals.volume / BigInt(totals.fills), { decimals: 0 })} average`
      : "no fills yet";

  return (
    <RevealGroup stagger={0.06}>
      <dl
        aria-label="Lifetime totals"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <Figure
          label="Settled volume"
          value={`$${formatUsdcCompact(totals.volume)}`}
          note={`across ${formatCount(totals.days)} indexed days`}
          hint="Both sides of every matched prediction, added up. A $5 call with $5 against it counts as $10 staked, because that is what actually moved in USDC."
          accent
        />
        <Figure
          label="Fills"
          value={formatCount(totals.fills)}
          note={averageFill}
          hint="One fill is one matched prediction: two people took opposite sides and the money is locked. An unmatched offer is not a fill and never reaches the chain."
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
        <Figure
          label="Claims that came true"
          value={heldShare ?? "—"}
          note={
            settled > 0
              ? `${formatCount(verdicts.held)} of ${formatCount(settled)} with a verdict`
              : "no verdict indexed yet"
          }
          hint={`Of the settled markets, how many of the things predicted actually happened. The contract fixes side A as the YES side, so the winning address is the verdict. ${formatCount(verdicts.unknown)} more resolutions are excluded: their fill predates this index, so there is no pair to place the winner against, and counting them as either side would invent an answer the chain never gave.`}
        />
      </dl>
    </RevealGroup>
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
  // `h-full` on both: the grid now stretches the reveal wrapper, not the card.
  return (
    // The hover z-index is what lets the bubble out. Motion leaves
    // `filter: blur(0px)` on this element once the reveal has run, and a
    // filter other than `none` creates a stacking context even at zero blur —
    // so the bubble’s own z-index only ever competed inside its own card, and
    // the next card in the DOM painted straight over it. The card has to
    // outrank its siblings, and the card is the element that owns the
    // stacking context. `focus-within` covers the keyboard path, where there
    // is no hover to help.
    <RevealItem
      lift
      className="relative z-0 h-full hover:z-20 focus-within:z-20"
    >
      <Card className="h-full p-4">
        {accent ? (
          <span
            aria-hidden
            className="holo-line absolute inset-x-0 top-0 h-px rounded-t-xl"
          />
        ) : null}
        {/* The anchor for the hint bubble: `Info` positions against the
            nearest positioned ancestor and spans it, so the bubble comes out
            the width of the card and drops just under this line. */}
        <dt className="relative font-label text-micro tracking-[0.04em] text-faint uppercase">
          {label}
          {hint ? <Info>{hint}</Info> : null}
        </dt>
        <dd
          className={`tnum mt-3 text-figure leading-none font-medium tracking-[-0.02em] sm:text-[1.75rem] ${
            accent ? "holo-text" : "text-ink"
          }`}
        >
          {value}
        </dd>
        <p className="mt-2 text-meta leading-snug text-muted">{note}</p>
      </Card>
    </RevealItem>
  );
}
