export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-hairline bg-surface/70 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHead({
  title,
  note,
  aside,
}: {
  title: string;
  note?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-hairline px-5 py-4">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {note ? (
          <p className="mt-1 max-w-[64ch] text-[13px] leading-relaxed text-muted">
            {note}
          </p>
        ) : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}
