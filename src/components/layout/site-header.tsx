"use client";

import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Transition,
  type Variants,
} from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { RingoMark } from "@/components/ui/icons";

const RINGO_APP = "https://app.joinringo.xyz";

/** The anchors these point at are the wrappers in app/page.tsx. */
const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
  { id: "markets", label: "Markets" },
  { id: "traders", label: "Traders" },
] as const;

/**
 * `top` is the bare bar over the hero, `pinned` the floating pill, `hidden` the
 * pill parked off-screen while the reader is moving down a long table.
 */
type Phase = "top" | "pinned" | "hidden";

const TOP_UNTIL = 18;
const HIDE_AFTER = 300;
/* Trackpads emit sub-pixel jitter in both directions; without a dead zone the
   pill flickers between hidden and pinned while the page is standing still. */
const DEAD_ZONE = 5;

const SPRING: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 32,
  mass: 0.9,
};

const surface = {
  bare: {
    height: 56,
    /* Not 1152 (max-w-6xl): the band carries the page's own 20/24px gutter, so
       the bar has to be that much narrower for the logo to land exactly on the
       content edge of <main> rather than a gutter to its left. */
    maxWidth: 1104,
    paddingLeft: 0,
    paddingRight: 0,
    backgroundColor: "rgba(4, 5, 10, 0)",
    borderColor: "rgba(255, 255, 255, 0)",
    backdropFilter: "blur(0px)",
    boxShadow: "0 24px 60px -30px rgba(0, 0, 0, 0)",
  },
  pill: {
    height: 48,
    maxWidth: 736,
    paddingLeft: 16,
    paddingRight: 6,
    backgroundColor: "rgba(4, 5, 10, 0.7)",
    borderColor: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(18px)",
    boxShadow: "0 24px 60px -30px rgba(0, 0, 0, 0.95)",
  },
};

const NAV_VARIANTS: Variants = {
  top: { ...surface.bare, y: 0, opacity: 1 },
  pinned: { ...surface.pill, y: 0, opacity: 1 },
  hidden: { ...surface.pill, y: -108, opacity: 0 },
};

export function SiteHeader() {
  const navRef = useRef<HTMLElement>(null);
  const phaseRef = useRef<Phase>("top");
  const menuRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("top");
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const [menuOpen, setMenuOpen] = useState(false);
  /* Bumped on every top -> pinned crossing so the sheen remounts and its
     one-shot sweep actually replays. */
  const [sweep, setSweep] = useState(0);

  const reduced = useReducedMotion();
  const spring: Transition = reduced ? { duration: 0 } : SPRING;

  const { scrollY, scrollYProgress } = useScroll();

  /* The ring reads a spring rather than the raw progress: the browser reports
     scroll in coarse steps on a trackpad fling, and the smoothing is what makes
     the outline look like it is being poured rather than stepped. */
  const progress = useSpring(scrollYProgress, {
    stiffness: 240,
    damping: 40,
    mass: 0.35,
  });
  const filled = useTransform(
    progress,
    (v) => `${Math.min(1, Math.max(0, v)) * 100}%`,
  );
  /* White, not the holo accent: the mint read as a coloured stripe glued to the
     rim. Plain light travelling along the outline says the same thing and
     leaves the CTA's foil as the only colour on the pill. */
  const ring = useMotionTemplate`linear-gradient(90deg, rgb(255 255 255 / 0.5) 0%, rgb(255 255 255 / 0.5) calc(${filled} - 18px), rgb(255 255 255 / 0) ${filled})`;

  /* Cursor position on the pill, in element space, for the highlight. */
  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);
  const spotlight = useMotionTemplate`radial-gradient(150px circle at ${mx}px ${my}px, rgb(255 255 255 / 0.07), transparent 68%)`;

  useEffect(() => {
    menuRef.current = menuOpen;
  }, [menuOpen]);

  /* A reload restores the scroll position without emitting a scroll event, so
     without this the pill starts as the bare bar halfway down the page. Read on
     the next frame: the server rendered `top`, and correcting it during the
     hydration pass is what would make the two disagree. */
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (window.scrollY > TOP_UNTIL) {
        phaseRef.current = "pinned";
        setPhase("pinned");
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useMotionValueEvent(scrollY, "change", (y) => {
    const last = scrollY.getPrevious() ?? y;
    const prev = phaseRef.current;

    let next: Phase = prev;
    if (y <= TOP_UNTIL) next = "top";
    else if (menuRef.current) next = "pinned";
    else if (y > last + DEAD_ZONE && y > HIDE_AFTER) next = "hidden";
    else if (y < last - DEAD_ZONE || prev === "top") next = "pinned";

    if (next !== prev) {
      phaseRef.current = next;
      setPhase(next);
      if (prev === "top") setSweep((n) => n + 1);
    }

    /* The section that owns the upper third of the viewport is the one being
       read, not the one that merely touches the top edge. */
    const line = y + window.innerHeight * 0.32;
    let current: string = SECTIONS[0].id;
    for (const section of SECTIONS) {
      const el = document.getElementById(section.id);
      if (el && el.getBoundingClientRect().top + y <= line) current = section.id;
    }
    setActive(current);
  });

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const box = navRef.current?.getBoundingClientRect();
      if (!box) return;
      mx.set(event.clientX - box.left);
      my.set(event.clientY - box.top);
    },
    [mx, my],
  );

  const atTop = phase === "top";

  return (
    <>
      {/* The band keeps its height in flow, so nothing below it moves when the
          bar collapses into the pill. It is transparent and click-through;
          only the nav itself takes the pointer. */}
      <header className="pointer-events-none sticky top-0 z-50 flex h-20 w-full items-center px-5 sm:px-6">
        <motion.nav
          ref={navRef}
          aria-label="Primary"
          initial={false}
          animate={phase}
          variants={NAV_VARIANTS}
          transition={spring}
          onPointerMove={onPointerMove}
          onPointerLeave={() => {
            mx.set(-200);
            my.set(-200);
          }}
          className="group pointer-events-auto relative mx-auto flex w-full items-center justify-between gap-3 rounded-full border"
        >
          {/* Scroll read-out: the pill's own outline fills left to right. */}
          <motion.span
            aria-hidden
            className="nav-ring"
            style={{ background: ring }}
            animate={{ opacity: atTop ? 0 : 1 }}
            transition={{ duration: reduced ? 0 : 0.4 }}
          />

          {/* Foil that follows the cursor across the pill. */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: spotlight, display: atTop ? "none" : "block" }}
          />

          <AnimatePresence>
            {!atTop && !reduced && (
              <span
                key={sweep}
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
              >
                <motion.span
                  className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-16deg] bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  initial={{ x: 0, opacity: 0 }}
                  animate={{ x: ["0%", "420%"], opacity: [0, 0.9, 0] }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
            )}
          </AnimatePresence>

          <Link
            href="/"
            className="relative z-10 flex shrink-0 items-center gap-2.5 transition-opacity duration-200 hover:opacity-75"
          >
            {/* No rotation: the mark has an orientation of its own and reads as
                broken the moment it is turned. Only the size follows the pill. */}
            <motion.span
              className="text-mark"
              animate={{ scale: atTop ? 1 : 0.92 }}
              transition={spring}
            >
              <RingoMark className="h-5 w-5" />
            </motion.span>
            {/* No descriptor after the wordmark. "Market index" used to sit
                here and it was doing three things badly: repeating a word the
                hero already uses in its other sense, restating what the h1
                says in a full sentence, and putting the internal noun for an
                order-book position where the public product category goes. */}
            <span className="text-[15px] font-semibold tracking-[-0.01em]">
              Ringo
            </span>
          </Link>

          {/* Centred absolutely so the pill can resize under it without the
              links jumping, and so it cross-fades with the metadata that
              occupies the same band at rest. */}
          <SectionLinks
            active={active}
            show={!atTop}
            spring={spring}
            reduced={reduced}
          />

          <div className="relative z-10 flex items-center gap-2">
            {/*
              Plain metadata, not badges. It belongs to the page at rest; once
              the reader is inside the tables that same space is worth more as
              navigation, so it hands over to the links above.
            */}
            <div className="hidden lg:block">
              <Collapse show={atTop} reduced={reduced}>
                <dl className="flex items-center gap-5 pr-2">
                  <Meta label="Network" value="Polygon" />
                  <Meta label="Settles in" value="USDC" />
                  <Meta label="Index" value="The Graph" />
                </dl>
              </Collapse>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:border-holo/40 hover:text-ink md:hidden"
            >
              <span aria-hidden className="flex flex-col gap-1.25">
                <span className="block h-px w-4 bg-current" />
                <span className="block h-px w-4 bg-current" />
              </span>
            </button>

            <motion.a
              href={RINGO_APP}
              target="_blank"
              rel="noreferrer noopener"
              whileHover={reduced ? undefined : { y: -1 }}
              whileTap={reduced ? undefined : { scale: 0.97 }}
              transition={spring}
              className={`group/cta relative flex items-center gap-1.5 overflow-hidden rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-500 ${
                atTop
                  ? "border-hairline bg-raised/50 text-muted hover:border-holo/40 hover:text-ink"
                  : "border-transparent text-holo-ink"
              }`}
            >
              {/* The fill cross-fades under the label: background-image cannot
                  interpolate, so the foil gets its own layer. */}
              <motion.span
                aria-hidden
                className="holo-fill absolute inset-0"
                animate={{ opacity: atTop ? 0 : 1 }}
                transition={{ duration: reduced ? 0 : 0.45 }}
              />
              <span className="relative z-10">Open Ringo</span>
              <svg
                viewBox="0 0 16 16"
                className="relative z-10 h-3 w-3 opacity-70 transition-transform duration-200 group-hover/cta:translate-x-px group-hover/cta:-translate-y-px"
                aria-hidden
              >
                <path
                  d="M5.5 10.5 10.5 5.5M6 5.5h4.5V10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.a>
          </div>
        </motion.nav>
      </header>

      <MobileMenu
        open={menuOpen}
        active={active}
        reduced={reduced}
        onClose={() => setMenuOpen(false)}
      />
    </>
  );
}

/**
 * Width collapse without a magic max-width. `width: auto` is measured by motion
 * and animated in pixels; the child stays `w-max` and nowrap so the text keeps
 * its intrinsic size while the box closes over it instead of reflowing.
 */
function Collapse({
  show,
  reduced,
  children,
}: {
  show: boolean;
  reduced: boolean | null;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          className="overflow-hidden"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "auto", opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={
            reduced ? { duration: 0 } : { duration: 0.45, ease: [0.16, 1, 0.3, 1] }
          }
        >
          <div className="w-max">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectionLinks({
  active,
  show,
  spring,
  reduced,
}: {
  active: string;
  show: boolean;
  spring: Transition;
  reduced: boolean | null;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute left-1/2 hidden md:block"
          initial={{ opacity: 0, y: 6, x: "-50%", filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, x: "-50%", filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 6, x: "-50%", filter: "blur(4px)" }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 0.4, delay: 0.12, ease: [0.16, 1, 0.3, 1] }
          }
        >
          <ul className="relative flex items-center gap-1">
            {SECTIONS.map((section) => (
              <li key={section.id} className="relative">
                {/* One marker for the whole row: `layoutId` makes motion move
                    the same box between links, so the travel is continuous
                    instead of a fade in one place and out of another. */}
                {active === section.id && (
                  <motion.span
                    layoutId="nav-marker"
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-white/10"
                    transition={spring}
                  />
                )}
                <a
                  href={`#${section.id}`}
                  aria-current={active === section.id ? "true" : undefined}
                  className={`relative block rounded-full px-3 py-1.5 text-[13px] transition-colors duration-300 ${
                    active === section.id
                      ? "text-ink"
                      : "text-faint hover:text-muted"
                  }`}
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const PANEL: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.055, delayChildren: 0.08 } },
};

const ITEM: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  shown: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

function MobileMenu({
  open,
  active,
  reduced,
  onClose,
}: {
  open: boolean;
  active: string;
  reduced: boolean | null;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const restore = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();

    return () => {
      document.body.style.overflow = restore;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className="fixed inset-0 z-60 md:hidden"
          initial="hidden"
          animate="shown"
          exit="hidden"
          variants={PANEL}
        >
          <motion.button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="absolute inset-0 w-full bg-ground/80 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.3 }}
          />

          <div
            ref={panelRef}
            className="relative flex h-full flex-col justify-center gap-1 px-8"
          >
            {SECTIONS.map((section, index) => (
              <motion.a
                key={section.id}
                href={`#${section.id}`}
                onClick={onClose}
                aria-current={active === section.id ? "true" : undefined}
                variants={ITEM}
                className="flex items-baseline gap-4 py-2 text-[30px] font-semibold tracking-[-0.02em]"
              >
                <span className="w-6 font-mono text-[11px] text-faint tabular-nums">
                  0{index + 1}
                </span>
                <span
                  className={active === section.id ? "holo-text" : "text-ink/70"}
                >
                  {section.label}
                </span>
              </motion.a>
            ))}

            <motion.a
              href={RINGO_APP}
              target="_blank"
              rel="noreferrer noopener"
              onClick={onClose}
              variants={ITEM}
              className="holo-fill holo-fill-glow mt-8 flex items-center justify-center gap-2 rounded-full py-3 text-[14px] font-semibold"
            >
              Open Ringo
            </motion.a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
      <dt className="text-[11px] tracking-[0.08em] text-faint uppercase">
        {label}
      </dt>
      <dd className="text-[13px] text-ink">{value}</dd>
    </div>
  );
}
