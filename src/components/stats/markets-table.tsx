import { POLYGONSCAN, RANK, ROW, TD, TH } from "@/components/stats/table";
import { GrowRail } from "@/components/motion/grow";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
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
    note: "The claim as it was written, above the market's id. The claim reaches no log — RingoManager takes it as a calldata argument — so the index reads it back from the contract the factory deployed for that ringo. The id below it is keccak256 of Ringo's own ringoId, which is all the log carries, since the id is indexed on a dynamic type. A few rows show only the id: those are markets whose fill this index never saw, so there is no contract to ask.",
  },
  {
    term: "Status",
    note: "Settled means the contract paid out, and the label beside it says how the claim ended. The contract fixes side A as the YES side, so the winning address is the verdict: held means the claim turned out true, broken means it did not. Voided means the market was invalidated and nobody won. Open means no resolution has been indexed yet. A few settled rows show an address instead: those predate the fill event this index decodes, so there is no pair to place the winner against.",
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
    <Reveal>
      <Card className="overflow-hidden">
        <SectionHead
          title="Largest markets"
          note="Ranked by settled volume. The bar under each figure is its share of the largest market here."
        />

        <ColumnGlossary items={COLUMNS} />

        <div className="overflow-x-auto">
          <table
            /* The outer gutter, set on the table rather than on the cells: a
               descendant selector outranks the `px-4` each cell carries, so the
               edge wins on specificity instead of on stylesheet order. 20px on
               the left matches the card head above it; the right gets 24 because
               a right-aligned column runs into the edge, where a left-aligned
               one runs away from it. */
            className="w-full min-w-[640px] border-collapse text-body [&_:is(th,td):first-child]:pl-5 [&_:is(th,td):last-child]:pr-6"
          >
            <thead>
              <tr className="border-b border-hairline bg-raised/30 text-left">
                <th className={`${TH} w-10`}>#</th>
                <th className={TH}>Market</th>
                <th className={TH}>Status</th>
                <th className={`${TH} text-right`}>Volume</th>
                <th className={`${TH} text-center`}>Staked</th>
                <th className={`${TH} text-right`}>Opened</th>
              </tr>
            </thead>
            <RevealGroup as="tbody" stagger={0.028} amount={0.02}>
              {markets.map((market, index) => (
                <RevealItem
                  as="tr"
                  key={market.id}
                  className={ROW}
                  distance={8}
                  blur={false}
                >
                  <td className={RANK}>{index + 1}</td>
                  <td className={`${TD} max-w-[38ch]`}>
                    {market.claim === null ? (
                      <span className="whitespace-nowrap text-muted">
                        {shortAddress(market.id)}
                      </span>
                    ) : (
                      <>
                        <span className="line-clamp-2 leading-snug text-ink">
                          {market.claim}
                        </span>
                        <span className="mt-1 block font-mono text-[11px] text-faint">
                          {shortAddress(market.id)}
                        </span>
                      </>
                    )}
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
                  <td className={`${TD} text-center`}>
                    <SideSplit fill={market.ringos[0] ?? null} />
                  </td>
                  <td className={`${TD} text-right whitespace-nowrap text-muted`}>
                    {formatDate(market.createdAt)}
                  </td>
                </RevealItem>
              ))}
            </RevealGroup>
          </table>
        </div>

        <ShowMore href={moreHref} shown={markets.length} noun="markets" />
      </Card>
    </Reveal>
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
 * Every row is the same shape — one line of figures over one rail — which is
 * what puts the Staked figure on the same baseline as the Volume figure beside
 * it, and turns the exception into a change of colour rather than of shape.
 *
 * The column centres. Everything in it — the header, each row's figures and
 * every rail — sits on one axis through the middle of the cell, and the rail is
 * one fixed length on every row.
 *
 * Centring is the unusual choice for money, so it is worth saying why the usual
 * one does not work here. Right-alignment earns its keep when a column is one
 * shape repeated, because then the digits stack into a ledger. This column is
 * two shapes: "$250.00 each" ends in a word, "$42.12 vs $191.88" ends in a
 * digit. Pin their right edges together and the money lands somewhere different
 * on the two kinds of row. Reserve a slot after "each" so the money lines up,
 * and the header and the rails are left on an edge nothing else uses. Split the
 * cell into two table columns and each half gets a hard edge, but the header
 * then has no single thing to head. Every one of those was built and measured;
 * each fixes one relationship by breaking another, because they all assume an
 * edge that this column's content does not have.
 *
 * A centre line is the one axis all three can share, and sharing one axis is
 * what alignment means.
 */
function SideSplit({
  fill,
}: {
  fill: { amountA: string; amountB: string } | null;
}) {
  if (fill === null) {
    return (
      <StakedCell rail={<Rail />}>
        <span className="text-meta text-faint">no fill indexed</span>
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
 * The figures over their rail, both centred, so a row of either shape and the
 * rail under it come out on the column's one axis.
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
    <div className="flex flex-col items-center">
      {/* A flex line, not inline text: the gap spaces the figures from the
          words without leaving a trailing margin, which would push the line
          off the centre by half of itself. */}
      <span className="tnum flex items-baseline gap-1.5 whitespace-nowrap">
        {children}
      </span>
      {rail}
    </div>
  );
}

/** The words between and after the figures — "each", "vs". A step below them so
 *  the eye lands on the money first; spacing comes from the line's gap. */
function Word({ children }: { children: React.ReactNode }) {
  return <span className="text-meta text-faint">{children}</span>;
}

/**
 * The split, at one fixed length on every row — the same length as the Volume
 * rail beside it.
 *
 * Fixed, because nothing about this bar is a measurement. It is a ratio inside
 * its own row, and only where the two segments meet carries information; a
 * length that changed row to row would invite a comparison the figures cannot
 * support, and would break the one axis the column has.
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

  // The whole rail fills as one, towards the same edge the figures above it are
  // anchored to. Animating the two segments separately would read as the split
  // changing, which is the one thing this mark must never suggest.
  return (
    <GrowRail
      className={`mt-1.5 flex h-[3px] w-16 gap-[2px] ${quiet ? "opacity-25" : ""}`}
    >
      <span
        style={{ width: `${shareA}%` }}
        className="block h-full rounded-full bg-side-a"
      />
      <span className="block h-full flex-1 rounded-full bg-side-b" />
    </GrowRail>
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
          className={`ml-2 text-meta ${
            side === "A" ? "text-side-a" : "text-side-b"
          }`}
        >
          {side === "A" ? "Claim held" : "Claim broken"}
        </span>
      ) : winner === null ? null : (
        <a
          href={`${POLYGONSCAN}${winner}`}
          target="_blank"
          rel="noreferrer noopener"
          className="ml-2 font-mono text-meta text-faint transition-colors hover:text-muted"
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
