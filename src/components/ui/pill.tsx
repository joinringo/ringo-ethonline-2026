const TONES = {
  open: "border-open/30 bg-open/10 text-open",
  resolved: "border-resolved/30 bg-resolved/10 text-resolved",
  invalid: "border-hairline bg-raised text-invalid",
} as const;

export type PillTone = keyof typeof TONES;

export function Pill({
  tone,
  children,
}: {
  tone: PillTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 align-middle text-meta font-medium whitespace-nowrap ${TONES[tone]}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
