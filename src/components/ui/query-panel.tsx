"use client";

import { useState } from "react";
import { CopyButton } from "@/components/ui/copy-button";

type Result =
  | { state: "idle" }
  | { state: "running" }
  | { state: "ok"; body: string; rows: number | null; elapsedMs: number }
  | { state: "failed"; message: string };

/**
 * The query this page runs, with a button that runs it again in front of you.
 *
 * The pairing of a figure with the request that produced it is the argument
 * this site exists to make, and a reader who can execute that request is the
 * difference between showing the argument and proving it.
 *
 * The query text is a prop, not a copy: it is the same constant the server
 * passes to the subgraph, so the panel cannot drift from what actually ran.
 * Running it goes through /api/query, which accepts a name rather than a query
 * — see the route for why the browser never talks to the subgraph directly.
 *
 * This is interactive UI, not page data. Every figure on the page is still
 * server-rendered before this component mounts; nothing here is needed to read
 * the numbers, and with JavaScript off the query is still there to copy.
 */
export function QueryPanel({
  queryId,
  query,
  filename,
  note,
}: {
  queryId: "lifetime" | "markets" | "traders";
  query: string;
  filename: string;
  note: string;
}) {
  const [result, setResult] = useState<Result>({ state: "idle" });
  const text = query.trim();

  async function run() {
    setResult({ state: "running" });
    try {
      const response = await fetch(`/api/query?q=${queryId}`);
      const payload = await response.json();

      if (!response.ok) {
        setResult({
          state: "failed",
          message: payload.error ?? `Request failed with ${response.status}.`,
        });
        return;
      }

      setResult({
        state: "ok",
        body: JSON.stringify(payload.data, null, 2),
        rows: countRows(payload.data),
        elapsedMs: payload.elapsedMs,
      });
    } catch {
      setResult({
        state: "failed",
        message: "The request never completed. Check the network and retry.",
      });
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-hairline bg-raised/40 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="flex shrink-0 gap-1.5">
            <Dot className="bg-side-b/70" />
            <Dot className="bg-mark/70" />
            <Dot className="bg-resolved/70" />
          </span>
          <p className="ml-1 truncate font-mono text-[12px] text-muted">
            {filename}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <CopyButton value={text} label="Copy" />
          <button
            type="button"
            onClick={run}
            disabled={result.state === "running"}
            className="flex items-center gap-1.5 rounded-md border border-holo/40 bg-holo/10 px-2 py-1 text-[12px] font-medium text-ink transition-colors hover:border-holo/70 hover:bg-holo/15 disabled:cursor-progress disabled:opacity-60"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
              <path
                d="M5 3.4v9.2l7-4.6z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
            {result.state === "running" ? "Running" : "Run"}
          </button>
        </div>
      </div>

      <pre className="overflow-x-auto px-4 py-4 font-mono text-[12px] leading-[1.75] text-ink/90">
        <code>{text}</code>
      </pre>

      <div aria-live="polite">
        {result.state === "idle" ? null : (
          <div className="border-t border-hairline">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-raised/30 px-4 py-2">
              <p className="font-mono text-[11.5px] tracking-[0.06em] text-faint uppercase">
                Response
              </p>
              {result.state === "ok" ? (
                // The timing is our server's, and the response is cached for
                // 60s, so a second run inside that window reports about 0 ms.
                // Saying so beats printing a number that reads as a mock.
                <p className="tnum text-[12px] text-faint">
                  {result.rows === null ? null : `${result.rows} rows · `}
                  {result.elapsedMs} ms · 60s cache
                </p>
              ) : null}
            </div>

            {result.state === "running" ? (
              <p className="px-4 py-4 text-[12.5px] text-muted">
                Asking the index…
              </p>
            ) : null}

            {result.state === "failed" ? (
              <p className="px-4 py-4 text-[12.5px] leading-relaxed text-invalid">
                {result.message}
              </p>
            ) : null}

            {result.state === "ok" ? (
              <pre className="max-h-[280px] overflow-auto px-4 py-4 font-mono text-[11.5px] leading-[1.7] text-muted">
                <code>{result.body}</code>
              </pre>
            ) : null}
          </div>
        )}
      </div>

      <p className="border-t border-hairline px-4 py-3 text-[12.5px] leading-relaxed text-faint">
        {note}
      </p>
    </>
  );
}

/**
 * Rows in the one collection a query returns. Every query here asks for a
 * single top-level list, so this stays a count rather than a guess; anything
 * shaped differently reports nothing instead of a wrong number.
 */
function countRows(data: unknown): number | null {
  if (typeof data !== "object" || data === null) return null;
  const values = Object.values(data);
  if (values.length !== 1) return null;
  return Array.isArray(values[0]) ? values[0].length : null;
}

function Dot({ className }: { className: string }) {
  return <span className={`h-2 w-2 rounded-full ${className}`} />;
}
