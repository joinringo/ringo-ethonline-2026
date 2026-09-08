/** Share of the largest row on screen. Right-aligned, so it grows out of the figure. */
export function ShareBar({ value, of }: { value: bigint; of: bigint }) {
  if (of <= 0n) return null;
  const percent = Math.max(Number((value * 1000n) / of) / 10, 1.5);

  return (
    <span
      aria-hidden
      className="mt-1.5 ml-auto block h-[3px] w-16 overflow-hidden rounded-full bg-hairline-soft"
    >
      <span
        style={{ width: `${percent}%` }}
        className="ml-auto block h-full rounded-full bg-holo/70"
      />
    </span>
  );
}
