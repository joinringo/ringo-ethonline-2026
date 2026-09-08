"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";

// Scale, never width/height: there are several hundred of these marks and
// animating the box would relayout the row every frame. The real size stays
// server-rendered, so the mark is never drawn at a wrong value.
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const BAR: Variants = {
  hidden: { scaleY: 0, opacity: 0 },
  shown: { scaleY: 1, opacity: 1, transition: { duration: 0.5, ease: EASE } },
};

const RAIL: Variants = {
  hidden: { scaleX: 0 },
  shown: { scaleX: 1, transition: { duration: 0.65, ease: EASE, delay: 0.08 } },
};

/** A chart column. Timing comes from the `RevealGroup` around the series, so
 *  the columns cascade instead of landing at once. */
export function GrowBar({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className} style={style} />;

  return (
    <motion.div
      data-reveal
      className={`origin-bottom ${className}`}
      style={style}
      variants={BAR}
    />
  );
}

/** A rail under a figure. It carries its own trigger rather than inheriting a
 *  row's: staggered, a rail deep in a long table would still be empty by the
 *  time the eye reached it. */
export function GrowRail({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  if (reduced)
    return (
      <span aria-hidden className={className} style={style}>
        {children}
      </span>
    );

  return (
    <motion.span
      aria-hidden
      data-reveal
      className={`origin-right ${className}`}
      style={style}
      variants={RAIL}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.5 }}
    >
      {children}
    </motion.span>
  );
}
