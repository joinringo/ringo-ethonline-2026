/** Mirrors the real grid so nothing reflows when the data lands. */
export function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-10" aria-busy>
      <section className="grid gap-8 pb-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div className="flex flex-col gap-3">
          <div className="skeleton h-3 w-40" />
          <div className="skeleton mt-2 h-9 w-[92%]" />
          <div className="skeleton h-9 w-[70%]" />
          <div className="skeleton mt-3 h-3.5 w-[80%] max-w-[420px]" />
        </div>
        <div className="holo-card skeleton-block h-[260px] w-full rounded-xl" />
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="holo-card rounded-xl p-4">
            <div className="skeleton h-2.5 w-20" />
            <div className="skeleton mt-4 h-7 w-24" />
            <div className="skeleton mt-3 h-2.5 w-16" />
          </div>
        ))}
      </div>

      <div className="holo-card skeleton-block h-[220px] w-full rounded-xl" />
      <div className="holo-card skeleton-block h-[380px] w-full rounded-xl" />
      <span className="sr-only">Reading the index…</span>
    </div>
  );
}
