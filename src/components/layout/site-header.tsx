import Link from "next/link";
import { RingoMark } from "@/components/ui/icons";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline/80 bg-ground/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5"
          aria-label="Ringo — market index"
        >
          <RingoMark className="h-[22px] w-[22px] text-mark transition-transform duration-300 group-hover:scale-110" />
          <span className="text-[15px] font-semibold tracking-tight">Ringo</span>
          <span aria-hidden className="hidden h-3.5 w-px bg-hairline sm:block" />
          <span className="hidden text-[13px] text-muted sm:block">
            Market index
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Badge className="hidden sm:flex">Polygon · USDC</Badge>
          <Badge live>The Graph</Badge>
        </div>
      </div>
    </header>
  );
}

function Badge({
  children,
  live = false,
  className = "",
}: {
  children: React.ReactNode;
  live?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full border border-hairline bg-surface/80 px-2.5 py-1 text-[12px] font-medium text-muted ${className}`}
    >
      {live ? (
        <span
          aria-hidden
          className="live-dot h-1.5 w-1.5 rounded-full bg-resolved"
        />
      ) : null}
      {children}
    </span>
  );
}
