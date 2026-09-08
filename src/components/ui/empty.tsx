import { Card } from "@/components/ui/card";

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <Card className="px-5 py-12 text-center">
      <div
        aria-hidden
        className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-raised"
      >
        <span className="h-2 w-2 rounded-full bg-faint" />
      </div>
      <h2 className="mt-4 text-lead font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-[52ch] text-body leading-relaxed text-muted">
        {body}
      </p>
    </Card>
  );
}
