import { POLYGONSCAN, RANK, ROW, TD, TH } from "@/components/stats/table";
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
    note: "Settled means the contract paid out, and the label beside it says which of the two sides collected. Voided means it was invalidated and nobody won. Open means no resolution has been indexed yet. A few settled rows show an address instead of a side: those predate the fill event this subgraph decodes, so there is no pair to match the winner against.",
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
                  <span className="text-[13px] whitespace-nowrap text-ink">
                    {shortAddress(market.id)}
                  </span>
                </td>
                <td className={TD}>
                  <StatusMark
                    status={market.status}
                    winner={market.resolution?.resolver ?? null}
                    fill={market.ringos[0] ?? null}
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
 * The column right-aligns, like Volume and Opened. Two other anchors were
 * tried and measured first, and both are worse.
 *
 * Reserving a fixed slot after "each", so that "$250.00" and "$191.88" end at
 * the same x, pulls every figure off the edge the header and the rails still
 * sit on: three right edges where the rest of the table has one.
 *
 * Centring is worse still, and it fails in a way that is invisible until you
 * draw the column guides. Every other column in this table ends — or begins —
 * on a hard edge of glyphs: the addresses all start at one x, the volumes and
 * the dates all finish at one x. A centred column has no such edge by
 * construction. "$250.00 each" and "$42.12 vs $191.88" share a centre, so their
 * digits land in different places on every row and the column reads as the one
 * thing in the table that will not line up. That it is centred under its own
 * header does not rescue it; a header is one row and the edge is all of them.
 *
 * Right-aligned, the 8,480 of 8,779 rows that read "$N each" stack their digits
 * exactly, because "each" is a constant width. The few rows that differ break
 * the stack, which is the point: those are the rows worth looking at.
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
 * Figures over a rail as wide as they are.
 *
 * The box shrinks to the figures — `inline-flex`, placed by the cell's own
 * `text-right` — and the rail, stretched by the column's default cross-axis
 * alignment, comes out exactly that width. So the rail starts where the money
 * starts and ends where the line ends, on every row, whatever the row says. A
 * fixed-width rail pinned to the cell edge cannot do that: on an even row it
 * lands under the word "each" instead of under the amount.
 *
 * The shape — one line of figures, then a rail — is the Volume cell's, which is
 * what puts the two columns' figures on one baseline.
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
    <div className="inline-flex flex-col">
      <span className="tnum flex items-baseline gap-1.5 whitespace-nowrap">
        {children}
      </span>
      {rail}
    </div>
  );
}

/** The connective tissue between figures — "each", "vs". A step below them so
 *  the eye lands on the money first; spacing comes from the line's gap. */
function Word({ children }: { children: React.ReactNode }) {
  return <span className="text-[12.5px] text-faint">{children}</span>;
}

/**
 * The split, drawn the width of the figures above it.
 *
 * Volume's rail keeps a fixed width and this one does not, because they measure
 * different things. Volume's is a share of the largest row on screen, so its
 * track is the scale and has to be identical on every row or the lengths stop
 * being comparable. This one is a ratio inside its own row; nothing compares
 * across rows, so the width is free to say which figures it belongs to.
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
    return <span aria-hidden className="mt-1.5 block h-[3px]" />;
  }

  return (
    <span
      aria-hidden
      className={`mt-1.5 flex h-[3px] gap-[2px] ${quiet ? "opacity-25" : ""}`}
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
 * next column. The address is the winner, and it is the only thing settlement
 * adds that the row does not already say.
 *
 * It used to be printed as a truncated hash, which is honest and nearly
 * useless: nobody learns anything from 0xfa32…b317. Matching it against the two
 * sides of the fill turns it into which side won — the same fact in the
 * vocabulary the hero key and the Staked column already taught. Checked across
 * every settled market in the index: the winner is one of the two traders 8,289
 * times, and neither of them zero times.
 *
 * The other 1,114 are v1-era markets with no fill to match against, so the
 * address is all there is. It is shown and linked rather than dropped.
 *
 * The winner sits on the badge's line rather than under it, and that is a
 * layout constraint before it is a taste: it was the only cell in the table
 * that could be two lines tall, so a settled row stood 21px taller than a
 * voided one and every column beside it hung from the top of the extra space.
 * The table had no steady row rhythm. One line per row everywhere is what
 * gives it one.
 */
function StatusMark({
  status,
  winner,
  fill,
}: {
  status: Market["status"];
  winner: string | null;
  fill: { userA: { id: string }; userB: { id: string } } | null;
}) {
  if (status === "INVALID") return <Pill tone="invalid">Voided</Pill>;
  if (status !== "RESOLVED") return <Pill tone="open">Open</Pill>;

  const side = winningSide(winner, fill);

  return (
    <span className="whitespace-nowrap">
      <Pill tone="resolved">Settled</Pill>

      {side !== null ? (
        <span
          className={`ml-2 text-[12px] ${
            side === "A" ? "text-side-a" : "text-side-b"
          }`}
        >
          Side {side} won
        </span>
      ) : winner === null ? null : (
        <a
          href={`${POLYGONSCAN}${winner}`}
          target="_blank"
          rel="noreferrer noopener"
          className="ml-2 font-mono text-[12px] text-faint transition-colors hover:text-muted"
        >
          won by {shortAddress(winner)}
        </a>
      )}
    </span>
  );
}

/** Which side of the fill the winning address is, or null when it cannot be told. */
function winningSide(
  winner: string | null,
  fill: { userA: { id: string }; userB: { id: string } } | null
): "A" | "B" | null {
  if (winner === null || fill === null) return null;
  const w = winner.toLowerCase();
  if (w === fill.userA.id.toLowerCase()) return "A";
  if (w === fill.userB.id.toLowerCase()) return "B";
  return null;
}
