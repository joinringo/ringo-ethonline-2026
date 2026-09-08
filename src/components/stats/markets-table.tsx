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
    term: "Sides",
    note: "What each side staked. Nearly every Ringo is matched at even money, so this usually reads Even — the split is shown only when the two sides put in different amounts, which is where a price lives: $42 against $191 is the market calling that outcome roughly four to one. Blank for the v1-era markets stubbed from a resolution with no fill we decode.",
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
              <th className={`${TH} text-right`}>Sides</th>
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
 * What each side put in, and the shape of the bet.
 *
 * This column replaced Fills and People, which were constants: no market has
 * more than one fill and none has other than two participants, because a market
 * is keyed per ringo and therefore *is* one matched pair. Two of seven columns
 * reading 1 and 2 on every row told a reader nothing and invited the question.
 *
 * The split does vary, and it is the number a prediction market is actually
 * about: the ratio between the stakes is the price the two sides agreed on.
 * It is also the only place the Side A / Side B key in the header pays off.
 */
function SideSplit({
  fill,
}: {
  fill: { amountA: string; amountB: string } | null;
}) {
  if (fill === null) {
    return <span className="text-[13px] text-faint">no fill indexed</span>;
  }

  const a = BigInt(fill.amountA);
  const b = BigInt(fill.amountB);
  const total = a + b;

  // Ringo is overwhelmingly matched at even money — 8,480 of 8,779 fills are
  // exactly 50/50 — so printing the same figure twice is what this column would
  // do on almost every row, and two identical amounts read as a rendering bug
  // rather than as data. Saying "even" once is both shorter and truer, and it
  // leaves the split to mean something on the rows where it differs.
  if (a === b) {
    return (
      <span className="text-[13px] whitespace-nowrap">
        <span className="text-muted">Even</span>
        <span className="tnum ml-1.5 text-faint">${formatUsdc(a)} a side</span>
      </span>
    );
  }

  // Percent in bigint, then to a number once: the ratio survives amounts that
  // would lose precision as floats.
  const shareA =
    total > 0n ? Number((a * 1000n) / total) / 10 : 50;

  return (
    <div className="inline-flex flex-col items-end gap-1.5">
      <span className="tnum text-[13px] whitespace-nowrap">
        <span className="text-side-a">${formatUsdc(a)}</span>
        <span className="mx-1 text-faint">vs</span>
        <span className="text-side-b">${formatUsdc(b)}</span>
      </span>
      {/* The two segments are chroma-matched by design, so they sit at 1.02:1
          against each other — the split is invisible without colour vision.
          The gap makes it legible in greyscale. */}
      <span
        aria-hidden
        className="flex h-[3px] w-20 gap-[2px] overflow-hidden rounded-full"
      >
        <span
          style={{ width: `${shareA}%` }}
          className="block h-full rounded-full bg-side-a/80"
        />
        <span className="block h-full flex-1 rounded-full bg-side-b/80" />
      </span>
    </div>
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
