"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-5 py-20 sm:px-6">
      <div className="holo-card w-full rounded-xl">
        <div className="flex items-center gap-2.5 border-b border-hairline px-5 py-3.5">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-side-b" />
          <p className="text-[12px] font-medium tracking-[0.12em] text-faint uppercase">
            Read failed
          </p>
        </div>

        <div className="px-5 py-7 sm:px-7">
          <h1 className="text-[24px] leading-tight font-semibold tracking-tight sm:text-[27px]">
            The index did not answer
          </h1>

          <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-muted">
            The subgraph is either still syncing or the query URL in this
            deployment is wrong. Nothing here is cached from an earlier read, so
            there is no stale figure to show you instead.
          </p>

          <pre className="mt-6 overflow-x-auto rounded-lg border border-hairline bg-ground/70 px-4 py-3 font-mono text-[13px] leading-relaxed break-words whitespace-pre-wrap text-side-b">
            {error.message}
          </pre>

          {/* Next hashes the real stack trace into `digest` and logs it on the
              server under the same value. On its own the number says nothing,
              so it is labelled as what it is for: the line to quote. */}
          {error.digest ? (
            <p className="mt-2.5 text-[12px] text-faint">
              Server log reference{" "}
              <span className="tnum font-mono text-muted">{error.digest}</span>
            </p>
          ) : null}

          <button
            type="button"
            onClick={reset}
            className="holo-fill holo-fill-glow mt-7 inline-flex items-center justify-center rounded-lg px-5 py-3 text-[13px] font-semibold hover:scale-[1.01] active:scale-95"
          >
            Read it again
          </button>
        </div>
      </div>
    </main>
  );
}
