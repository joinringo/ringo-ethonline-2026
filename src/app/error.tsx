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
      <div className="rise w-full rounded-xl border border-hairline bg-surface/70 p-7 sm:p-9">
        <div
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded-full border border-side-b/30 bg-side-b/10"
        >
          <span className="h-2 w-2 rounded-full bg-side-b" />
        </div>

        <h1 className="mt-5 text-[26px] leading-tight font-semibold tracking-tight">
          The index did not answer
        </h1>

        <p className="mt-3 max-w-[58ch] text-[14.5px] leading-relaxed text-muted">
          The subgraph is either still syncing or the query URL in this
          deployment is wrong. Nothing on this page is cached from a previous
          read, so there is nothing stale to show you instead.
        </p>

        <pre className="mt-6 overflow-x-auto rounded-lg border border-hairline bg-ground/60 px-4 py-3 font-mono text-[12.5px] leading-relaxed break-words whitespace-pre-wrap text-side-b">
          {error.message}
        </pre>

        {error.digest ? (
          <p className="mt-2 font-mono text-[11.5px] text-faint">
            digest {error.digest}
          </p>
        ) : null}

        <button
          type="button"
          onClick={reset}
          className="mt-7 rounded-lg bg-holo px-4 py-2.5 text-[14px] font-medium text-holo-ink transition-opacity hover:opacity-90"
        >
          Read it again
        </button>
      </div>
    </main>
  );
}
