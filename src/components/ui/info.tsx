/**
 * Hover-and-focus note, CSS only — no client bundle for a tooltip.
 *
 * The bubble is positioned against the nearest positioned ancestor rather than
 * against the `?` itself, and spans it: whoever renders an `Info` marks that
 * ancestor `relative`, and the bubble comes out exactly as wide as it. That is
 * what keeps it on screen. Hanging a fixed 248px off an 18px control puts it
 * over the viewport edge, and *which* card it escapes from moves with the
 * breakpoint — measured, it ran off the right at 490, 534, 674, 874, 998 and
 * 1254px wide, from a different card almost every time. Sized to its container
 * it cannot overflow at any width, with no per-card or per-breakpoint rule.
 *
 * Opens downward always: the tables sit inside `overflow-x-auto` in an
 * `overflow-hidden` card, so a bubble opening upward from a header row would be
 * clipped.
 *
 * The bubble must also outrank whatever sits beside it. `z-index` only sorts
 * within a stacking context, so a card that is one — a transform, a filter, an
 * opacity below 1 — traps this z-30 inside itself and the next card in the DOM
 * paints straight over the bubble. The card raises itself on hover; see
 * `kpi-row`.
 */
export function Info({ children }: { children: React.ReactNode }) {
  return (
    <span className="group/info ml-1.5 inline-flex align-middle">
      <span
        tabIndex={0}
        role="note"
        /* The ring draws at 20px and the target is 32: `before` is an invisible
           box around it, which is how a mark this small clears the 24px minimum
           without growing into the label it hangs off. At 18px square it was
           under that minimum in both directions, and it is focusable. */
        className="relative flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-hairline text-micro leading-none font-medium text-faint transition-colors before:absolute before:-inset-1.5 before:content-[''] group-hover/info:border-muted group-hover/info:text-muted focus-visible:border-holo focus-visible:text-holo focus-visible:outline-none"
      >
        ?
      </span>
      {/* Pointer events come back once it is open. While hidden it must not eat
          clicks on the card underneath, but while shown the reader has to be
          able to put the pointer on it — these are full sentences, and someone
          reading them zoomed in cannot be made to hold the pointer on a 20px
          mark to keep them on screen. */}
      <span className="pointer-events-none absolute inset-x-0 top-full z-30 mt-2 rounded-lg border border-hairline bg-raised px-3 py-2.5 text-left text-body leading-relaxed font-normal tracking-normal text-muted normal-case opacity-0 shadow-xl transition-opacity duration-150 group-hover/info:pointer-events-auto group-hover/info:opacity-100 group-focus-within/info:pointer-events-auto group-focus-within/info:opacity-100">
        {children}
      </span>
    </span>
  );
}
