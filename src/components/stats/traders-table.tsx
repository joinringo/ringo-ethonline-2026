import { POLYGONSCAN, RANK, ROW, TD, TH } from "@/components/stats/table";
import { Card, SectionHead } from "@/components/ui/card";
import { ExternalIcon } from "@/components/ui/icons";
import { Info } from "@/components/ui/info";
import { ShareBar } from "@/components/ui/share-bar";
import { ShowMore } from "@/components/ui/show-more";
import { formatRelativeDay, formatUsdc, shortAddress } from "@/lib/format";
import type { Trader } from "@/lib/subgraph/queries";

export function TradersTable({
  traders,
  moreHref,
}: {
  traders: Trader[];
  moreHref: string | null;
}) {
  if (traders.length === 0) return null;

  const settledAny = traders.some(
    (trader) => trader.wins > 0 || trader.losses > 0
  );
  const top = traders.reduce(
    (max, trader) => (BigInt(trader.volume) > max ? BigInt(trader.volume) : max),
    0n
  );

  return (
    <Card className="overflow-hidden">
      <SectionHead
        title="Most active traders"
        note="Ranked by lifetime volume staked across both sides of every fill."
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-hairline bg-raised/30 text-left">
              <th className={`${TH} w-10`}>#</th>
              <th className={TH}>
                Address
                <Info>
                  The trader&rsquo;s smart account on Polygon. Every Ringo user
                  has one — bets are sent as ERC-4337 user operations, not from
                  a plain wallet. Click through for Polygonscan.
                </Info>
              </th>
              <th className={`${TH} text-right`}>
                Staked
                <Info align="right">
                  Lifetime USDC this address put at risk, counting whichever
                  side of each fill it took.
                </Info>
              </th>
              {settledAny ? (
                <th className={`${TH} text-right`}>
                  Record
                  <Info align="right">
                    Wins are exact: the resolution event names the winner.
                    Losses are inferred from the other side of the fill, so they
                    undercount for markets whose fill is older than this index.
                  </Info>
                </th>
              ) : null}
              <th className={`${TH} text-right`}>
                Last seen
                <Info align="right">
                  The most recent block this address appeared in, as a fill or
                  as the winner of a resolution.
                </Info>
              </th>
            </tr>
          </thead>
          <tbody>
            {traders.map((trader, index) => (
              <tr key={trader.id} className={`group ${ROW}`}>
                <td className={RANK}>{index + 1}</td>
                <td className={TD}>
                  <a
                    href={`${POLYGONSCAN}${trader.id}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 font-mono text-[13px] transition-colors hover:text-holo"
                  >
                    {shortAddress(trader.id)}
                    <ExternalIcon />
                  </a>
                </td>
                <td className={`${TD} text-right`}>
                  <span className="tnum font-medium">
                    ${formatUsdc(trader.volume)}
                  </span>
                  <ShareBar value={BigInt(trader.volume)} of={top} />
                </td>
                {settledAny ? (
                  <td className={`${TD} tnum text-right whitespace-nowrap`}>
                    <span className="text-side-a">{trader.wins}</span>
                    <span className="text-faint"> / </span>
                    <span className="text-side-b">{trader.losses}</span>
                  </td>
                ) : null}
                <td className={`${TD} text-right whitespace-nowrap text-muted`}>
                  {formatRelativeDay(trader.lastActive)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {settledAny ? null : (
        <p className="border-t border-hairline px-5 py-4 text-[12.5px] leading-relaxed text-faint">
          Win and loss counts appear once the index reaches a settled market.
          The resolution event names the winner, so the record is real — it is
          simply empty until the sync gets there.
        </p>
      )}

      <ShowMore href={moreHref} shown={traders.length} noun="traders" />
    </Card>
  );
}
