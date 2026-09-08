"use client";

import "lenis/dist/lenis.css";
import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";

/**
 * Lenis drives the real window scroll position every frame rather than
 * translating a container, which is why motion's `useScroll`, every
 * `whileInView`, the header's section tracking and `getBoundingClientRect` all
 * keep working untouched. `root` renders no element of its own.
 */

/** Clears the 80px sticky band with air. Kept in step with `scroll-padding-top`
 *  in globals.css, which handles the same jump with JavaScript off. */
const ANCHOR_OFFSET = -104;

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();

  return (
    <ReactLenis
      root
      options={{
        // Lerp, not duration: frame-rate independent, so 60Hz and 144Hz feel
        // the same.
        lerp: 0.085,
        // Touch stays native — smoothing a finger drag fights the platform.
        syncTouch: false,
        // Reduced motion keeps the instance so the menu can still lock the
        // scroll, but hands the wheel and anchors back to the browser.
        smoothWheel: reduced !== true,
        anchors: reduced === true ? false : { offset: ANCHOR_OFFSET },
      }}
    >
      {children}
    </ReactLenis>
  );
}
