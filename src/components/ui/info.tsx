/**
 * Hover-and-focus note, CSS only — no client bundle for a tooltip.
 *
 * Opens downward always: the tables sit inside `overflow-x-auto` in an
 * `overflow-hidden` card, so a bubble opening upward from a header row would
 * be clipped. `align` pins it to the column's own edge.
 */
export function Info({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <span className="group/info relative ml-1.5 inline-flex align-middle">
      <span
        tabIndex={0}
        role="note"
        className="flex h-[18px] w-[18px] cursor-help items-center justify-center rounded-full border border-hairline text-[11px] leading-none font-medium text-faint transition-colors group-hover/info:border-muted group-hover/info:text-muted focus-visible:border-holo focus-visible:text-holo focus-visible:outline-none"
      >
        ?
      </span>
      <span
        className={`pointer-events-none absolute top-full z-30 mt-2 w-[248px] rounded-lg border border-hairline bg-raised px-3 py-2.5 text-left text-[12px] leading-relaxed font-normal tracking-normal text-muted normal-case opacity-0 shadow-xl transition-opacity duration-150 group-hover/info:opacity-100 group-focus-within/info:opacity-100 ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        {children}
      </span>
    </span>
  );
}
