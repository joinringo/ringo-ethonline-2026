"use client";

import Link, { useLinkStatus } from "next/link";
import { formatCount } from "@/lib/format";

/**
 * `href` is null at the end of the data: a subgraph has no total at query
 * time, so a response shorter than its limit is the only honest end signal.
 *
 * A client component for one reason: `useLinkStatus`. Paging is a soft
 * navigation the page renders in place, so between the click and the payload
 * nothing on screen moves, and without a pending state here the button reads
 * as dead. The alternative — keying the page's Suspense boundary on the limits
 * — does give feedback, by throwing the whole page away for a skeleton: the
 * reader loses the rows they were reading to gain twenty more. See app/page.
 *
 * `prefetch` is set rather than left to the default, which for a force-dynamic
 * route fetches no further than the nearest loading boundary. Fetching the
 * whole payload while the button sits in the viewport is what puts the next
 * batch one frame from the click instead of one round trip.
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
      <span className="text-body text-faint">
        Showing {formatCount(shown)} {noun}
      </span>
      {href === null ? (
        <span className="text-body text-faint">End of the index</span>
      ) : (
        <Link
          href={href}
          scroll={false}
          prefetch
          className="rounded-full border border-hairline px-3 py-1.5 text-body font-medium text-ink transition-colors hover:border-holo/50 hover:bg-raised"
        >
          <MoreLabel noun={noun} />
        </Link>
      )}
    </div>
  );
}

/**
 * Label and spinner share one grid cell, so the button holds its width across
 * the swap. A control that resizes at the moment it is pressed reads as a
 * layout bug rather than as progress, and this one sits on a card's bottom
 * edge where a few pixels of movement are visible.
 */
function MoreLabel({ noun }: { noun: string }) {
  const { pending } = useLinkStatus();

  return (
    <span className="grid place-items-center">
      <span
        className={`col-start-1 row-start-1 transition-opacity duration-150 ${
          pending ? "opacity-0" : "opacity-100"
        }`}
      >
        Show more
      </span>
      <span
        aria-hidden={!pending}
        className={`col-start-1 row-start-1 transition-opacity duration-150 ${
          pending ? "opacity-100" : "opacity-0"
        }`}
      >
        <span
          role="status"
          className="block size-3.5 animate-spin rounded-full border-2 border-hairline border-t-holo"
        >
          <span className="sr-only">Loading more {noun}</span>
        </span>
      </span>
    </span>
  );
}
