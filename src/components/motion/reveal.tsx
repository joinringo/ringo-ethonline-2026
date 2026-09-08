"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";

// One curve and one distance for the whole page: components choose what
// animates and in what order, never the timing.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const DURATION = 0.55;
const RISE = 14;

const VIEWPORT = { once: true, amount: 0.15 } as const;

type Custom = { delay?: number; distance?: number; blur?: boolean };

const ITEM: Variants = {
  hidden: (custom: Custom = {}) => ({
    opacity: 0,
    y: custom.distance ?? RISE,
    filter: custom.blur === false ? "blur(0px)" : "blur(6px)",
  }),
  shown: (custom: Custom = {}) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: DURATION, ease: EASE, delay: custom.delay ?? 0 },
  }),
};

const GROUP_TAGS = {
  div: motion.div,
  section: motion.section,
  dl: motion.dl,
  tbody: motion.tbody,
};
const ITEM_TAGS = { div: motion.div, tr: motion.tr };

export function Reveal({
  children,
  className = "",
  delay = 0,
  distance,
  blur,
  immediate = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
  blur?: boolean;
  /** Animate on mount instead of on scroll — for content above the fold. */
  immediate?: boolean;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  // `data-reveal` is the hook the noscript rule in app/layout.tsx uses to force
  // these back to visible: motion emits the hidden state during SSR.
  return (
    <motion.div
      data-reveal
      className={className}
      variants={ITEM}
      custom={{ delay, distance, blur }}
      initial="hidden"
      {...(immediate
        ? { animate: "shown" }
        : { whileInView: "shown", viewport: VIEWPORT })}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger parent. Motion propagates the variant through React context, not the
 * DOM, so items can sit at any depth and the semantic element in between keeps
 * its tag and its attributes.
 */
export function RevealGroup({
  children,
  className = "",
  as = "div",
  stagger = 0.07,
  delay = 0,
  amount = VIEWPORT.amount,
  immediate = false,
}: {
  children: React.ReactNode;
  className?: string;
  as?: keyof typeof GROUP_TAGS;
  stagger?: number;
  delay?: number;
  amount?: number;
  immediate?: boolean;
}) {
  const reduced = useReducedMotion();
  const Plain = as;
  if (reduced) return <Plain className={className}>{children}</Plain>;

  const Tag = GROUP_TAGS[as] as typeof motion.div;

  return (
    <Tag
      className={className}
      initial="hidden"
      variants={{
        hidden: {},
        shown: {
          transition: { staggerChildren: stagger, delayChildren: delay },
        },
      }}
      {...(immediate
        ? { animate: "shown" }
        : { whileInView: "shown", viewport: { once: true, amount } })}
    >
      {children}
    </Tag>
  );
}

export function RevealItem({
  children,
  className = "",
  as = "div",
  distance,
  blur,
  lift = false,
}: {
  children: React.ReactNode;
  className?: string;
  as?: keyof typeof ITEM_TAGS;
  distance?: number;
  blur?: boolean;
  lift?: boolean;
}) {
  const reduced = useReducedMotion();
  const Plain = as;
  if (reduced) return <Plain className={className}>{children}</Plain>;

  const Tag = ITEM_TAGS[as] as typeof motion.div;

  // The hover spring goes inside the variant: as a `transition` prop it would
  // also become the default for `shown` and replace the page's curve.
  return (
    <Tag
      data-reveal
      className={className}
      variants={ITEM}
      custom={{ distance, blur }}
      {...(lift
        ? {
            whileHover: {
              y: -3,
              transition: { type: "spring", stiffness: 320, damping: 26 },
            },
          }
        : {})}
    >
      {children}
    </Tag>
  );
}
