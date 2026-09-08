import { RANK, ROW, TD, TH } from "@/components/stats/table";
import { Card, SectionHead } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import {
  ColumnGlossary,
  type ColumnNote,
} from "@/components/stats/column-glossary";
import { Pill } from "@/components/ui/pill";
import { ShareBar } from "@/components/ui/share-bar";
import { ShowMore } from "@/components/ui/show-more";
import { formatDate, formatUsdc, shortAddress } from "@/lib/format";
import type { Market } from "@/lib/subgraph/queries";

const COLUMNS: ColumnNote[] = [
  {
    term: "Market",
    note: "The market's id, which is keccak256 of Ringo's own ringoId. The contract indexes that id on a dynamic type, so the log carries only its hash and never the readable value. The claim text is not on chain at all.",
  },
  {
    term: "Status",
    note: "Settled means the contract paid out and named a winner. Voided means the market was invalidated and no side won. Open means no resolution has been indexed yet.",
  },
  {
    term: "Volume",
    note: "Both stakes added together, in USDC. The bar underneath is this market's share of the largest one on screen.",
  },
  {
    term: "Staked",
    note: "What the two people put in. It is almost always the same on both sides, so it usually reads as a single figure. When the two differ, both are shown: $42 against $191 means the second person had to stake more to take the other side, because the first outcome was the likelier one. The rail under the figures is that split — flat and faint when the sides are even, in full colour when they are not, so the rows that differ are findable without reading the numbers. Blank for the v1-era markets stubbed from a resolution with no fill we decode.",
  },
  {
    term: "Opened",
    note: "When the market was created, in UTC. For markets that predate the creation event this subgraph decodes, it falls back to the first event actually seen.",
  },
];

export function MarketsTable({
  markets,
  moreHref,
}: {
  markets: Market[];
  moreHref: string | null;
}) {
  if (markets.length === 0) {
    return (
      <Empty
        title="No markets indexed yet"
        body="The subgraph is deployed but has not reached a block containing a market. Check the sync status in Subgraph Studio."
      />
    );
  }

  const top = markets.reduce(
    (max, market) => (BigInt(market.volume) > max ? BigInt(market.volume) : max),
    0n
  );

  return (
    <Card className="overflow-hidden">
      <SectionHead
        title="Largest markets"
        note="Ranked by settled volume. The bar under each figure is its share of the largest market here."
      />

      <ColumnGlossary items={COLUMNS} />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-hairline bg-raised/30 text-left">
              <th className={`${TH} w-10`}>#</th>
              <th className={TH}>Market</th>
              <th className={TH}>Status</th>
              <th className={`${TH} text-right`}>Volume</th>
              <th className={`${TH} text-right`}>Staked</th>
              <th className={`${TH} text-right`}>Opened</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((market, index) => (
              <tr key={market.id} className={ROW}>
                <td className={RANK}>{index + 1}</td>
                <td className={TD}>
                  <span className="font-mono text-[13px] whitespace-nowrap text-ink">
                    {shortAddress(market.id)}
                  </span>
                </td>
                <td className={TD}>
                  <StatusMark
                    status={market.status}
                    winner={market.resolution?.resolver ?? null}
                  />
                </td>
                <td className={`${TD} text-right`}>
                  <span className="tnum font-medium">
                    ${formatUsdc(market.volume)}
                  </span>
                  <ShareBar value={BigInt(market.volume)} of={top} />
                </td>
                <td className={`${TD} text-right`}>
                  <SideSplit fill={market.ringos[0] ?? null} />
                </td>
                <td className={`${TD} text-right whitespace-nowrap text-muted`}>
                  {formatDate(market.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ShowMore href={moreHref} shown={markets.length} noun="markets" />
    </Card>
  );
}

/**
 * What the two people put in.
 *
 * This column replaced Fills and People, which were constants: no market has
 * more than one fill and none has other than two participants, because a market
 * is keyed per ringo and therefore *is* one matched pair. Two of seven columns
 * reading 1 and 2 on every row told a reader nothing.
 *
 * The replacement was first written on the assumption that the ratio between
 * the stakes is where a prediction market's price lives. Measured, that is not
 * what Ringo does: 8,480 of 8,779 fills are the same on both sides. So the
 * common case is stated once as a plain figure, and the coloured split is kept
 * for the rows that differ — the only rows where it says anything, and where it
 * is now the thing that stands out. It is also the one place the Side A / Side
 * B key in the header pays off.
 *
 * Every row is the same shape — one line of figures over one rail. That is what
 * puts the Staked figure on the same baseline as the Volume figure beside it,
 * which a one-line cell sitting next to a two-line one cannot do, and it turns
 * the exception into a change of colour rather than a change of shape: the rail
 * is always the true split, faint when the sides are even and at full strength
 * when they are not, so the rows that differ are findable without reading a
 * number.
 *
 * The column has exactly one vertical anchor, the cell's right edge, and the
 * header, the last figure and the rail all sit on it. Giving the amounts their
 * own axis — a fixed slot reserved after the word "each", so "$250.00" and
 * "$191.88" end at the same x — was tried and is worse: it buys alignment
 * between two kinds of row that are meant to look different, and pays for it by
 * pulling every figure off the edge the header and the rails still use. One
 * anchor everything shares beats two that each hold half the column.
 */
function SideSplit({
  fill,
}: {
  fill: { amountA: string; amountB: string } | null;
}) {
  if (fill === null) {
    return (
      <StakedCell rail={<Rail />}>
        <span className="text-[13px] text-faint">no fill indexed</span>
      </StakedCell>
    );
  }

  const a = BigInt(fill.amountA);
  const b = BigInt(fill.amountB);

  // Percent in bigint, then to a number once: the ratio survives amounts that
  // would lose precision as floats.
  const total = a + b;
  const shareA = total > 0n ? Number((a * 1000n) / total) / 10 : 50;

  // Ringo is overwhelmingly matched at the same amount on both sides — 8,480 of
  // 8,779 fills — so printing the figure twice is what this column would do on
  // almost every row, and two identical amounts read as a rendering bug.
  //
  // "$250.00 each" rather than "Even": even money is the term of art, and a
  // reader who has never seen a prediction market should not have to know it to
  // read a table. Each is the same fact in a word everyone already has.
  if (a === b) {
    return (
      <StakedCell rail={<Rail shareA={shareA} quiet />}>
        <span className="text-muted">${formatUsdc(a)}</span>
        <Word>each</Word>
      </StakedCell>
    );
  }

  return (
    <StakedCell rail={<Rail shareA={shareA} />}>
      <span className="text-side-a">${formatUsdc(a)}</span>
      <Word>vs</Word>
      <span className="text-side-b">${formatUsdc(b)}</span>
    </StakedCell>
  );
}

/**
 * Figures over a rail, both anchored on the cell's right edge — the same shape
 * and the same anchor as the Volume cell beside it, so the two columns land on
 * one baseline and their rails line up.
 *
 * The figures take the table's own size rather than a step down. They are money
 * in the column next to money, and a 13px amount beside a 14px one reads as a
 * different kind of number, not as a quieter one. Weight and colour carry the
 * hierarchy instead: Volume is medium and full ink, this is regular and muted.
 */
function StakedCell({
  children,
  rail,
}: {
  children: React.ReactNode;
  rail: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-end">
      <span className="tnum whitespace-nowrap">{children}</span>
      {rail}
    </div>
  );
}

/** The connective tissue between figures — "each", "vs". Set below the figures
 *  so the eye lands on the money first. */
function Word({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-1.5 text-[12.5px] font-normal text-faint">
      {children}
    </span>
  );
}

/**
 * The split, at the same length as the Volume rail next door.
 *
 * The two segments are chroma-matched by design, so they sit at 1.02:1 against
 * each other — the split is invisible without colour vision. The gap makes it
 * legible in greyscale. `quiet` is the even case: the bar is still the real
 * ratio, drawn faint. Two matched halves at a quarter strength stay readable as
 * a split without competing for the row — the colour is what marks the rows
 * that are not even, so on the rows that are it has to recede.
 */
function Rail({ shareA, quiet }: { shareA?: number; quiet?: boolean }) {
  if (shareA === undefined) {
    // Holds the row's height open so the figures above it stay on the baseline.
    return <span aria-hidden className="mt-1.5 block h-[3px] w-16" />;
  }

  return (
    <span
      aria-hidden
      className={`mt-1.5 flex h-[3px] w-16 gap-[2px] ${quiet ? "opacity-25" : ""}`}
    >
      <span
        style={{ width: `${shareA}%` }}
        className="block h-full rounded-full bg-side-a"
      />
      <span className="block h-full flex-1 rounded-full bg-side-b" />
    </span>
  );
}

/**
 * The resolution event carries an amount and an address. The amount is not
 * shown: markets are keyed per ringo, so it always equals the volume in the
 * next column. The winner is the only thing settlement adds.
 */
function StatusMark({
  status,
  winner,
}: {
  status: Market["status"];
  winner: string | null;
}) {
  if (status === "INVALID") return <Pill tone="invalid">Voided</Pill>;
  if (status !== "RESOLVED") return <Pill tone="open">Open</Pill>;

  return (
    <div>
      <Pill tone="resolved">Settled</Pill>
      {winner === null ? null : (
        <span className="mt-1.5 block font-mono text-[12px] whitespace-nowrap text-faint">
          won by {shortAddress(winner)}
        </span>
      )}
    </div>
  );
}
