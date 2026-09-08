import { GridBackdrop } from '@/components/visual/backdrops'

/**
 * Holo backdrop — the app's section-masthead device, at page scale.
 *
 * A raking holo light over the technical grid, plus an iridescent wash. The
 * grid is not decoration here: `color-dodge` AMPLIFIES the backdrop rather
 * than painting on it, so the band only becomes visible where there is already
 * something with value. Remove the hairlines and the light dies.
 *
 * MOUNTING RULE: this must NOT sit in a stacking context of its own, or the
 * rake would resolve against transparency and paint as a flat pastel smear.
 * So: `position: absolute` with NO z-index, as the first child of a `relative`
 * parent whose own z-index is `auto` (see app/page.tsx). That keeps the
 * atmosphere canvas in the same stacking context, which is what gets lit.
 */
export function HoloBackdrop({ dimCenter = false }: { dimCenter?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <GridBackdrop size={72} opacity={0.07} />

      <div className="holo-rake" />

      {/* above the grid so the hairlines catch the sheen, below the scrim so
          the content column stays dark */}
      <div className="holo-wash absolute inset-0" />

      {/* legibility scrim — heaviest on the left, where both the intro type
          wall and the console header are set */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(3,3,5,0.6) 0%, rgba(3,3,5,0.24) 50%, transparent 84%)',
        }}
      />

      {/* Mission console only: the card column runs down the middle, so the
          centre drops to the cards' own floor and they read as one surface
          instead of plates on a lit backdrop. Mounted always, faded by
          opacity, so the handover from the intro is not a cut. */}
      <div
        className="absolute inset-0 transition-opacity duration-1000 ease-out"
        style={{
          opacity: dimCenter ? 1 : 0,
          background:
            'radial-gradient(66% 50% at 50% 50%, rgba(2,2,3,0.5) 50%, rgba(2,2,3,0.2) 90%)',
        }}
      />
    </div>
  )
}
