import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-5 py-20 sm:px-6">
      <div className="w-full rounded-xl border border-hairline bg-surface/70 p-7 sm:p-9">
        <p className="font-mono text-[12px] tracking-[0.14em] text-faint uppercase">
          404
        </p>
        <h1 className="mt-4 text-[26px] leading-tight font-semibold tracking-tight">
          Nothing here
        </h1>
        <p className="mt-3 max-w-[56ch] text-[14.5px] leading-relaxed text-muted">
          This app has one page: the market index. Everything else lives in the
          Ringo bot on X.
        </p>
        <Link
          href="/"
          className="mt-7 inline-block rounded-lg bg-holo px-4 py-2.5 text-[14px] font-medium text-holo-ink transition-opacity hover:opacity-90"
        >
          Back to the index
        </Link>
      </div>
    </main>
  );
}
