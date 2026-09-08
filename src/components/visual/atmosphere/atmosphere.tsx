'use client'

import { useEffect, useRef, useState } from 'react'
import { GrainOverlay } from '@/components/visual/backdrops'
import { ATMO_HERO, type AtmoStop } from './palette'
import { ATMO_VERT, atmoFrag } from './shader'

/**
 * Atmosphere — the living background of the page.
 *
 * Ported from ringo-overlay's hero chapter. ONE persistent fullscreen canvas
 * behind all content, ONE fragment shader. The pointer interaction IS the
 * atmosphere: the primary presence leans toward the cursor, so there is no
 * separate glow layer chasing the mouse.
 *
 * GPU budget (non-negotiable):
 *  - renders at 0.5–0.72× resolution and upscales (fog forgives resolution)
 *  - 30fps cap — slow fog reads identically at 30 and 60
 *  - powerPreference "low-power", no alpha/depth/stencil/antialias
 *  - pauses when the tab is hidden
 *
 * Degradation:
 *  - low-end touch devices (or no WebGL / failed compile) → CSS fallback:
 *    the same palette as drifting radial-gradient layers
 *  - prefers-reduced-motion → a single still frame (atmosphere without
 *    movement), re-rendered only on resize
 */

type Mode = 'gl' | 'css'

const FRAME_MS = 1000 / 30

function buildProgram(
  gl: WebGLRenderingContext,
  vertSrc: string,
  fragSrc: string,
): WebGLProgram | null {
  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh)
      return null
    }
    return sh
  }
  const vs = compile(gl.VERTEX_SHADER, vertSrc)
  const fs = compile(gl.FRAGMENT_SHADER, fragSrc)
  if (!vs || !fs) return null
  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    return null
  }
  return program
}

// Deferred GL release. The cleanup must NOT lose the context synchronously:
// React StrictMode (dev) runs mount → cleanup → remount on the SAME canvas, and
// a canvas whose context was force-lost hands that same dead context back to
// getContext() — the shader then fails to compile and the atmosphere silently
// falls back to CSS on every dev load. Deferring the release one task lets the
// StrictMode remount cancel it; a REAL unmount has no remount, so the timer
// fires and frees the context as before.
let pendingGlRelease: number | undefined

export function Atmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<Mode | null>(null)

  useEffect(() => {
    // remount within the same task (StrictMode) → keep the context alive
    if (pendingGlRelease !== undefined) {
      clearTimeout(pendingGlRelease)
      pendingGlRelease = undefined
    }
    const canvas = canvasRef.current
    const nav = navigator as Navigator & { deviceMemory?: number }
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const cores = nav.hardwareConcurrency ?? 8
    const mem = nav.deviceMemory ?? 8

    // genuinely low-end touch devices go straight to the CSS atmosphere
    if (!canvas || (coarse && (mem <= 3 || cores <= 4))) {
      setMode('css')
      return
    }

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    }) as WebGLRenderingContext | null
    if (!gl) {
      setMode('css')
      return
    }

    const economy = coarse
    const program = buildProgram(gl, ATMO_VERT, atmoFrag(economy ? 2 : 3))
    if (!program) {
      setMode('css')
      return
    }
    setMode('gl')

    gl.useProgram(program)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    )
    const aPos = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const u = {
      res: gl.getUniformLocation(program, 'uRes'),
      time: gl.getUniformLocation(program, 'uTime'),
      a: gl.getUniformLocation(program, 'uColorA'),
      b: gl.getUniformLocation(program, 'uColorB'),
      pa: gl.getUniformLocation(program, 'uPosA'),
      pb: gl.getUniformLocation(program, 'uPosB'),
      intensity: gl.getUniformLocation(program, 'uIntensity'),
    }

    // the stop is fixed (one chapter): colors and energy upload once, and
    // only time + the leaning presence change per frame
    const S: AtmoStop = ATMO_HERO
    gl.uniform3f(u.a, S.a[0], S.a[1], S.a[2])
    gl.uniform3f(u.b, S.b[0], S.b[1], S.b[2])
    gl.uniform2f(u.pb, S.pb[0], S.pb[1])
    gl.uniform1f(u.intensity, S.intensity)

    const drawFrame = (time: number, paX: number, paY: number) => {
      gl.uniform1f(u.time, time)
      gl.uniform2f(u.pa, paX, paY)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // resolution matters for banding: upscaling an already-banded low-res
    // gradient multiplies the steps — the shader is trivial, spend here
    const scale = economy ? 0.5 : 0.72
    const disposers: (() => void)[] = []

    const sizeCanvas = () => {
      canvas.width = Math.max(2, Math.round(window.innerWidth * scale))
      canvas.height = Math.max(2, Math.round(window.innerHeight * scale))
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(u.res, canvas.width, canvas.height)
    }

    // involuntary context loss (driver reset, tab eviction on low-end mobile):
    // stop drawing into a dead context and fall back to the CSS atmosphere for
    // good — a frozen canvas is worse than gradients
    const releaseGl = () => {
      pendingGlRelease = window.setTimeout(() => {
        pendingGlRelease = undefined
        gl.getExtension('WEBGL_lose_context')?.loseContext()
      }, 0)
    }

    // ── reduced motion: atmosphere without movement ──────────────────────
    if (reduce) {
      const staticFrame = () => {
        sizeCanvas()
        drawFrame(140, S.pa[0], S.pa[1])
      }
      staticFrame()
      window.addEventListener('resize', staticFrame)
      disposers.push(() => window.removeEventListener('resize', staticFrame))
      const onLostStatic = (e: Event) => {
        e.preventDefault()
        setMode('css')
      }
      canvas.addEventListener('webglcontextlost', onLostStatic)
      disposers.push(() =>
        canvas.removeEventListener('webglcontextlost', onLostStatic),
      )
      disposers.push(releaseGl)
      return () => disposers.forEach((d) => d())
    }

    // ── live path ────────────────────────────────────────────────────────
    sizeCanvas()
    window.addEventListener('resize', sizeCanvas)
    disposers.push(() => window.removeEventListener('resize', sizeCanvas))

    // the pointer interaction IS the atmosphere: the primary presence leans
    // toward the cursor (fine pointers only — never a separate glow layer)
    const mouse = { x: 0.5, y: 0.5, on: false }
    if (window.matchMedia('(pointer: fine)').matches) {
      const onMove = (e: PointerEvent) => {
        mouse.x = e.clientX / window.innerWidth
        mouse.y = 1 - e.clientY / window.innerHeight
        mouse.on = true
      }
      window.addEventListener('pointermove', onMove, { passive: true })
      disposers.push(() => window.removeEventListener('pointermove', onMove))
    }

    const cur = { paX: S.pa[0], paY: S.pa[1] }
    // fog time starts mid-stream so the first frame is already textured
    let simTime = 100

    const draw = (dt: number) => {
      simTime += dt
      const k = 1 - Math.exp(-dt * 2.4)
      // cursor lean — a gentle pull, never a chase
      const mx = mouse.on ? (mouse.x - S.pa[0]) * 0.07 : 0
      const my = mouse.on ? (mouse.y - S.pa[1]) * 0.07 : 0
      cur.paX += (S.pa[0] + mx - cur.paX) * k
      cur.paY += (S.pa[1] + my - cur.paY) * k
      drawFrame(simTime, cur.paX, cur.paY)
    }

    let raf = 0
    let last = 0
    let prev = performance.now()
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (now - last < FRAME_MS - 1) return // 30fps is enough for slow fog
      const dt = Math.min(0.1, (now - prev) / 1000)
      last = now
      prev = now
      draw(dt)
    }
    raf = requestAnimationFrame(loop)

    const onVis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) {
        prev = performance.now()
        raf = requestAnimationFrame(loop)
      }
    }
    document.addEventListener('visibilitychange', onVis)

    const onLost = (e: Event) => {
      e.preventDefault()
      cancelAnimationFrame(raf)
      setMode('css')
    }
    canvas.addEventListener('webglcontextlost', onLost)
    disposers.push(() => canvas.removeEventListener('webglcontextlost', onLost))

    disposers.push(() => {
      document.removeEventListener('visibilitychange', onVis)
      cancelAnimationFrame(raf)
      releaseGl()
    })

    return () => disposers.forEach((d) => d())
  }, [])

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        data-atmosphere
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          style={{ display: mode === 'gl' ? undefined : 'none' }}
        />
        {mode === 'css' && <CssAtmosphere />}
      </div>
      {/* film grain OVER everything: unifies the image and masks the 8-bit
          banding of every dark gradient on the page — at 2% it never touches
          text legibility */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[60]"
      >
        <GrainOverlay opacity={0.02} />
      </div>
    </>
  )
}

/**
 * CSS fallback — the same palette as stacked radial-gradient layers, on the
 * same static #010101 floor. No per-frame work at all: the drift is a CSS
 * animation on the compositor.
 */
function CssAtmosphere() {
  const rgb = (c: readonly [number, number, number], alpha: number) =>
    `rgb(${Math.round(c[0] * 255)} ${Math.round(c[1] * 255)} ${Math.round(
      c[2] * 255,
    )} / ${alpha.toFixed(3)})`

  const s = ATMO_HERO
  // palette positions are GL UV (y up) — CSS wants % from the top
  const layers =
    `radial-gradient(55% 44% at ${(s.pa[0] * 100).toFixed(1)}% ${(
      (1 - s.pa[1]) * 100
    ).toFixed(1)}%, ${rgb(s.a, s.intensity * 0.45)}, transparent 70%), ` +
    `radial-gradient(48% 40% at ${(s.pb[0] * 100).toFixed(1)}% ${(
      (1 - s.pb[1]) * 100
    ).toFixed(1)}%, ${rgb(s.b, s.intensity * 0.28)}, transparent 72%)`

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="animate-atmo-drift absolute -inset-[6%]"
        style={{ backgroundImage: layers }}
      />
      {/* quiet frame — same rule as the shader's edge mask: the outer band
          holds the static #010101 floor, so the drifting layer never moves
          the viewport margins */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, #010101, transparent 15%, transparent 85%, #010101),' +
            'linear-gradient(to bottom, #010101, transparent 12%, transparent 88%, #010101)',
        }}
      />
    </div>
  )
}
