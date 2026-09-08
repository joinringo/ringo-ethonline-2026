import { RANK, ROW, TD, TH } from "@/components/stats/table";
import { Card, SectionHead } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Info } from "@/components/ui/info";
import { Pill } from "@/components/ui/pill";
import { ShareBar } from "@/components/ui/share-bar";
import { ShowMore } from "@/components/ui/show-more";
import { formatCount, formatDate, formatUsdc, shortAddress } from "@/lib/format";
import type { Market } from "@/lib/subgraph/queries";

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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-hairline bg-raised/30 text-left">
              <th className={`${TH} w-10`}>#</th>
              <th className={TH}>
                Market
                <Info>
                  The market&rsquo;s id, which is keccak256 of Ringo&rsquo;s own
                  ringoId. The contract indexes that id on a dynamic type, so
                  the log carries only its hash and never the readable value.
                  The claim text is not on chain at all.
                </Info>
              </th>
              <th className={TH}>
                Status
                <Info>
                  Settled means the contract paid out and named a winner. Voided
                  means the market was invalidated and no side won. Open means
                  no resolution has been indexed yet.
                </Info>
              </th>
              <th className={`${TH} text-right`}>
                Volume
                <Info align="right">
                  Both stakes added together, in USDC. The bar underneath is
                  this market&rsquo;s share of the largest one on screen.
                </Info>
              </th>
              <th className={`${TH} text-right`}>
                Fills
                <Info align="right">
                  Matched bets in this market. It is almost always 1: markets
                  are keyed per ringo, so one market is one matched pair.
                </Info>
              </th>
              <th className={`${TH} text-right`}>
                People
                <Info align="right">
                  Distinct addresses that took a side, counted once each using
                  marker entities written while indexing — a subgraph cannot
                  count distinct values at query time.
                </Info>
              </th>
              <th className={`${TH} text-right`}>
                Opened
                <Info align="right">
                  When the market was created, in UTC. For markets that predate
                  the creation event this subgraph decodes, it falls back to the
                  first event actually seen.
                </Info>
              </th>
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
                <td className={`${TD} tnum text-right text-muted`}>
                  {formatCount(market.fills)}
                </td>
                <td className={`${TD} tnum text-right text-muted`}>
                  {formatCount(market.participants)}
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
