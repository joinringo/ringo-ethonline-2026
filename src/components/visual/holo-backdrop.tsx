import { GridBackdrop } from "@/components/visual/backdrops";

/**
 * Holo backdrop — ringo-marketing's section-masthead device, at page scale.
 *
 * A raking holo light over the technical grid, plus an iridescent wash. The
 * grid is not decoration: `color-dodge` AMPLIFIES the backdrop rather than
 * painting on it, so the band only becomes visible where there is already
 * something with value. Remove the hairlines and the light dies.
 *
 * MOUNTING RULE: this must NOT sit in a stacking context of its own, or the
 * rake resolves against transparency and paints as a flat pastel smear. So:
 * `position: absolute` with NO z-index, inside a `relative` parent whose own
 * z-index is `auto` (see app/layout.tsx). That keeps the atmosphere canvas in
 * the same stacking context, which is what gets lit.
 *
 * Two deviations from the original, both because that page is one viewport
 * tall and this one is a long document:
 *  - the left legibility scrim and the centre dimmer are gone. They are opaque
 *    fills, and an opaque fill that stops mid-page is a visible seam against
 *    the atmosphere still showing below it.
 *  - every remaining layer dissolves before the bottom edge (`holo-rake` gets
 *    a vertical fade in its mask), so the band ends rather than being cut.
 */
export function HoloBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* below ringo-marketing's 0.07: this is a data surface and the grid
          must not compete with the tables */}
      <GridBackdrop size={72} opacity={0.03} />

      <div className="holo-rake" />

      {/* above the grid, so the hairlines catch the sheen */}
      <div className="holo-wash absolute inset-0" />
    </div>
  );
}
