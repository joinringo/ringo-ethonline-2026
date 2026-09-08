import { Reveal } from "@/components/motion/reveal";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-hairline">
      <Reveal distance={10} blur={false}>
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-body leading-relaxed text-faint sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <p className="max-w-[64ch]">
            Markets settle in USDC on Polygon. Every figure on this page is read
            from the ringo-polygon subgraph, not from Ringo&rsquo;s database.
          </p>
          <p className="shrink-0 text-meta tracking-tight">ETHOnline 2026</p>
        </div>
      </Reveal>
    </footer>
  );
}
