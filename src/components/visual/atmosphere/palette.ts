/**
 * Atmosphere palette — ported from ringo-overlay.
 *
 * The overlay drives eight stops from a scroll conductor (one per chapter of
 * a Ringo round). This page is a single viewport, so it holds the ONE stop
 * that matters here: chapter 0, the hero — "the call forms".
 *
 * Colors are sRGB 0..1 triplets (WebGL-friendly), derived from the token
 * system. Positions are viewport UV with y = 0 at the BOTTOM (GL convention).
 */

export type AtmoStop = {
  /** dominant presence */
  a: readonly [number, number, number]
  pa: readonly [number, number]
  /** secondary presence */
  b: readonly [number, number, number]
  pb: readonly [number, number]
  /** overall energy 0..1 — the fog never outshines the content */
  intensity: number
}

/*                  saturation   relative luminance
     HOLO_GRAPHITE     0.063           0.379
     HOLO_LILAC        0.243           0.582
   The pair is deliberately NOT chroma-matched any more: the lower-left presence
   carries the light, the upper-right one carries the colour. */

// Near-neutral: only enough blue left to keep it from reading as dirty white.
//
// Halved from ringo-marketing's 0.37/0.38/0.395. This presence is the lower-left
// one and the shader gives it uIntensity * 1.4 against the lilac's * 0.6, so it
// is the page's dominant light. That reads as atmosphere behind a type wall and
// as glare behind a table of figures.
const HOLO_GRAPHITE = [0.19, 0.2, 0.215] as const
// the foil's lilac pole (#d3ccf0) — the calm counterweight
const HOLO_LILAC = [0.6, 0.56, 0.74] as const

/** Chapter 0 — the call forms: cyan low-left, lilac air upper-right. */
export const ATMO_HERO: AtmoStop = {
  a: HOLO_GRAPHITE,
  // Pinned to the lower-left corner, not floated in from it: at 0.22/0.3 the
  // ball still reached the content column. Anything below x 0.15 starts being
  // eaten by the shader's edge guard, so this is as far out as it goes.
  pa: [0.12, 0.15],
  b: HOLO_LILAC,
  pb: [0.85, 0.8],
  intensity: 0.25,
}
