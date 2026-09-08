import { POLYGONSCAN, RANK, ROW, TD, TH } from "@/components/stats/table";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Card, SectionHead } from "@/components/ui/card";
import { ExternalIcon } from "@/components/ui/icons";
import {
  ColumnGlossary,
  type ColumnNote,
} from "@/components/stats/column-glossary";
import { ShareBar } from "@/components/ui/share-bar";
import { ShowMore } from "@/components/ui/show-more";
import { formatRelativeDay, formatUsdc, shortAddress } from "@/lib/format";
import type { Trader } from "@/lib/subgraph/queries";

const COLUMNS: ColumnNote[] = [
  {
    term: "Address",
    note: "The player's smart account on Polygon. Ringo sends every call as an ERC-4337 user operation, so these are contracts rather than wallets. Links through to Polygonscan.",
  },
  {
    term: "Staked",
    note: "Lifetime USDC this address put at risk, on whichever side it took. Not the Staked column above, which is one market's two stakes.",
  },
  {
    term: "Record",
    note: "Wins are exact: the resolution names the winner. Losses are inferred from the other side of the fill, so they undercount for markets older than this index.",
  },
  {
    term: "Last seen",
    note: "The last time this address took a side or won one.",
  },
];

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
    <Reveal>
      <Card className="overflow-hidden">
        <SectionHead
          title="Most active traders"
          note="Ranked by lifetime volume staked across both sides of every fill."
        />

        <ColumnGlossary items={COLUMNS} />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-body">
            <thead>
              <tr className="border-b border-hairline bg-raised/30 text-left">
                <th className={`${TH} w-10`}>#</th>
                <th className={TH}>Address</th>
                <th className={`${TH} text-right`}>Staked</th>
                {settledAny ? (
                  <th className={`${TH} text-right`}>Record</th>
                ) : null}
                <th className={`${TH} text-right`}>Last seen</th>
              </tr>
            </thead>
            <RevealGroup as="tbody" stagger={0.028} amount={0.02}>
              {traders.map((trader, index) => (
                <RevealItem
                  as="tr"
                  key={trader.id}
                  className={`group ${ROW}`}
                  distance={8}
                  blur={false}
                >
                  <td className={RANK}>{index + 1}</td>
                  <td className={TD}>
                    <a
                      href={`${POLYGONSCAN}${trader.id}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 transition-colors hover:text-holo"
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
                      <span className="text-resolved">{trader.wins}</span>
                      <span className="text-faint"> / </span>
                      <span className="text-invalid">{trader.losses}</span>
                    </td>
                  ) : null}
                  <td className={`${TD} text-right whitespace-nowrap text-muted`}>
                    {formatRelativeDay(trader.lastActive)}
                  </td>
                </RevealItem>
              ))}
            </RevealGroup>
          </table>
        </div>

        {settledAny ? null : (
          <p className="border-t border-hairline px-5 py-4 text-body leading-relaxed text-faint">
            Win and loss counts appear once the index reaches a settled market.
            The resolution event names the winner, so the record is real — it is
            simply empty until the sync gets there.
          </p>
        )}

        <ShowMore href={moreHref} shown={traders.length} noun="traders" />
      </Card>
    </Reveal>
  );
}
