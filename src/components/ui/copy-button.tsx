"use client";

import { useEffect, useState } from "react";

/** The only client component on the page. */
export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Blocked outside a secure context. Failing quietly beats a modal that
      // would freeze every later interaction on the page.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      className="flex items-center gap-1.5 rounded-md border border-hairline bg-raised/60 px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:border-holo/50 hover:text-ink"
    >
      {copied ? (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <path
            d="M3 8.5 6.2 11.7 13 5"
            fill="none"
            stroke="var(--color-resolved)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <rect
            x="5.5"
            y="5.5"
            width="8"
            height="8"
            rx="1.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M10.5 3.5A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 3.5 10.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      )}
      {copied ? "Copied" : label}
    </button>
  );
}
