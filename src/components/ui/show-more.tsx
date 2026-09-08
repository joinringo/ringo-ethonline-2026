import Link from "next/link";
import { formatCount } from "@/lib/format";

/**
 * `href` is null at the end of the data: a subgraph has no total at query
 * time, so a response shorter than its limit is the only honest end signal.
 */
export function ShowMore({
  href,
  shown,
  noun,
}: {
  href: string | null;
  shown: number;
  noun: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-hairline px-5 py-3.5">
      <span className="text-[13px] text-faint">
        Showing {formatCount(shown)} {noun}
      </span>
      {href === null ? (
        <span className="text-[13px] text-faint">End of the index</span>
      ) : (
        <Link
          href={href}
          scroll={false}
          className="rounded-full border border-hairline px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-holo/50 hover:bg-raised"
        >
          Show more
        </Link>
      )}
    </div>
  );
}
