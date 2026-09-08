export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-hairline">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-[13px] leading-relaxed text-faint sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <p className="max-w-[64ch]">
          Markets settle in USDC on Polygon. Every figure on this page is read
          from the ringo-polygon subgraph, not from Ringo&rsquo;s database.
        </p>
        <p className="shrink-0 font-mono text-[12px] tracking-tight">
          ETHOnline 2026
        </p>
      </div>
    </footer>
  );
}
