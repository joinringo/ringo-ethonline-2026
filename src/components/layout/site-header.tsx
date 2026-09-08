import Link from "next/link";
import { RingoMark } from "@/components/ui/icons";

const RINGO_APP = "https://app.joinringo.xyz";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-[#04050a]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-15 max-w-6xl items-center justify-between gap-6 px-5 sm:px-6">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5"
          aria-label="Ringo — market index"
        >
          <RingoMark className="h-5 w-5 text-mark transition-opacity duration-200 group-hover:opacity-75" />
          <span className="text-[15px] font-semibold tracking-[-0.01em]">
            Ringo
          </span>
          <span aria-hidden className="hidden h-4 w-px bg-hairline sm:block" />
          <span className="hidden text-[13px] text-muted sm:block">
            Market index
          </span>
        </Link>

        <div className="flex items-center gap-5">
          {/*
            Plain metadata, not badges. The pills that were here read as
            stickers, and one carried a pulsing "live" dot wired to nothing.
          */}
          <dl className="hidden items-center gap-5 lg:flex">
            <Meta label="Network" value="Polygon" />
            <Meta label="Settles in" value="USDC" />
            <Meta label="Index" value="The Graph" />
          </dl>

          <a
            href={RINGO_APP}
            target="_blank"
            rel="noreferrer noopener"
            className="group flex items-center gap-1.5 rounded-lg border border-hairline bg-raised/50 px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:border-holo/40 hover:bg-raised hover:text-ink"
          >
            Open Ringo
            <svg
              viewBox="0 0 16 16"
              className="h-3 w-3 opacity-60 transition-transform duration-200 group-hover:translate-x-px group-hover:-translate-y-px"
              aria-hidden
            >
              <path
                d="M5.5 10.5 10.5 5.5M6 5.5h4.5V10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </div>

      <div aria-hidden className="hairline-rule h-px" />
    </header>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
      <dt className="text-[11px] tracking-[0.08em] text-faint uppercase">
        {label}
      </dt>
      <dd className="text-[13px] text-ink">{value}</dd>
    </div>
  );
}
