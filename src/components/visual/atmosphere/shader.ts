/**
 * Atmosphere fragment shader — gradient fog, not a light show.
 *
 * Ported from ringo-overlay. One fullscreen triangle, one parameterized
 * shader. Two colored "presences" breathe behind the content, revealed and
 * hidden by slow domain-warped value-noise fog.
 *
 * The overlay's scroll-chapter uniforms (uScroll / uFocus / uSpot / uWell)
 * are dropped here: this page is a single viewport with no chapters and no
 * solid furniture to pool darkness under. With those set to 0 the output is
 * pixel-identical to the overlay's hero chapter.
 *
 * Budget rules encoded here:
 *  - value noise (cheap) instead of simplex; octave count injected per tier
 *  - low frequencies + slow time scale — it breathes, it never swirls
 *  - output luminance is clamped so text above always keeps AA contrast
 */

export const ATMO_VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

export const atmoFrag = (octaves: number) => `
precision mediump float;

uniform vec2 uRes;
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec2 uPosA;
uniform vec2 uPosB;
uniform float uIntensity;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < ${Math.max(1, Math.round(octaves))}; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime * 0.032;

  // slow domain-warped fog — low frequency, it breathes rather than swirls
  vec2 q = vec2(fbm(p * 1.3 + t), fbm(p * 1.3 - t * 0.7 + 4.2));
  float fog = fbm(p * 2.1 + q * 0.85 + vec2(0.0, t * 0.4));

  vec2 pa = vec2(uPosA.x * aspect, uPosA.y);
  vec2 pb = vec2(uPosB.x * aspect, uPosB.y);
  // GAUSSIAN falloffs — a true ball: round, defined silhouette, no long
  // exponential tails (those read as diffuse smears). Subtlety comes from
  // the muted palette + low intensities, never from blurring the shape.
  float dda = length(p - pa);
  float ddb = length(p - pb);
  // A is the tightest of the two: corner-pinned, it has to die well before the
  // content column. It gains the lost energy back at the peak — see 1.4 below.
  float da = exp(-14.0 * dda * dda);
  float db = exp(-8.0 * ddb * ddb);

  // floor MUST equal the CSS --background (oklch(0.06 0 0) ≈ #010101) —
  // any opaque surface that fades to-background meets this canvas, and a
  // mismatched floor draws a visible cut line at every seam
  vec3 col = vec3(0.0045);
  // the fog TEXTURES the presences without dissolving their silhouette;
  // energy stays LOW — these are atmospheres, not stage lights
  col += uColorA * (da * (0.55 + 0.45 * fog)) * (uIntensity * 1.4);
  col += uColorB * (db * (0.5 + 0.5 * fog)) * (uIntensity * 0.6);
  // faint broadband fog so the black never reads dead flat — kept LOW:
  // this page's black is nearly pure, the fog must not gray it out
  col += vec3(0.005, 0.006, 0.007) * fog * uIntensity;

  // corner vignette keeps the edges quiet
  float vg = smoothstep(1.25, 0.35, length(uv - 0.5));
  col *= mix(0.78, 1.0, vg);

  // quiet frame: the outer gutters hold the STATIC #010101 floor, so the
  // drifting presences never move the viewport margins
  float edge = smoothstep(0.0, 0.15, uv.x) * smoothstep(1.0, 0.85, uv.x)
             * smoothstep(0.0, 0.12, uv.y) * smoothstep(1.0, 0.88, uv.y);
  col = mix(vec3(0.0045), col, edge);

  // contrast guard: the atmosphere must never contest the content
  col = min(col, vec3(0.3));

  // dither: dark 8-bit gradients band into visible "scales" without it.
  // STATIC noise (no uTime) — a per-frame re-roll reads as a faint
  // full-screen twinkle over the near-black margins.
  col += (hash(gl_FragCoord.xy) - 0.5) * (1.5 / 255.0);

  gl_FragColor = vec4(col, 1.0);
}
`
