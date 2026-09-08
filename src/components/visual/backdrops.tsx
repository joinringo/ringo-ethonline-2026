import { cn } from '@/lib/cn'

/**
 * Living background atoms, ported from ringo-overlay. Each is
 * `pointer-events-none` and absolutely fills its nearest positioned ancestor,
 * so drop them as the first child of a `relative` element. They are
 * intentionally quiet — depth, not decoration.
 */

/** Faint technical grid, radially faded, with an optional slow drift. */
export function GridBackdrop({
  className,
  size = 64,
  opacity = 0.05,
  drift = true,
}: {
  className?: string
  size?: number
  opacity?: number
  drift?: boolean
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 grid-fade overflow-hidden',
        className,
      )}
      style={{ opacity }}
    >
      {/* The drift is a transform, so it has to move a layer the radial mask is
          NOT on — otherwise the fade travels with the grid. Oversized by one
          tile: that is exactly how far grid-drift goes before it repeats. */}
      <div
        className={cn('absolute', drift && 'animate-grid-drift')}
        style={
          {
            inset: `-${size}px`,
            '--grid-tile': `${size}px`,
            backgroundImage:
              'linear-gradient(to right, #ffffff90 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: `${size}px ${size}px`,
          } as React.CSSProperties
        }
      />
    </div>
  )
}

/** Animated film grain — adds organic texture over flat darks. */
export function GrainOverlay({
  className,
  opacity = 0.04,
}: {
  className?: string
  opacity?: number
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {/* grain-shift travels up to 5%, so a layer sized exactly to the box
          uncovers a margin strip on every step. The grain LIFTS the near-black
          under it, so that strip flickers ~7x a second. Oversize past the
          furthest translate and clip — same fix CssAtmosphere already uses. */}
      <div className="grain absolute inset-[-6%]" style={{ opacity }} />
    </div>
  )
}
