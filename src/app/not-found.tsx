import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-5 py-20 sm:px-6">
      <div className="holo-card w-full rounded-xl">
        <div className="flex items-center gap-2.5 border-b border-hairline px-5 py-3.5">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-faint" />
          <p className="font-label text-micro tracking-[0.14em] text-faint uppercase">
            404
          </p>
        </div>

        <div className="px-5 py-7 sm:px-7">
          <h1 className="text-figure leading-tight font-semibold tracking-tight sm:text-[1.75rem]">
            Nothing here
          </h1>
          <p className="mt-3 max-w-[56ch] text-lead leading-relaxed text-muted">
            This app has one page: the market index. Everything else lives in
            the Ringo bot on X.
          </p>
          <Link
            href="/"
            className="holo-fill holo-fill-glow mt-7 inline-flex items-center justify-center rounded-lg px-5 py-3 text-body font-semibold hover:scale-[1.01] active:scale-95"
          >
            Back to the index
          </Link>
        </div>
      </div>
    </main>
  );
}
