export type ColumnNote = { term: string; note: React.ReactNode };

/**
 * Column definitions, as a disclosure under the table.
 *
 * This replaces a per-header hover bubble. That bubble was absolutely
 * positioned inside a `<th>`, so it always had a clipping ancestor — the card
 * is `overflow-hidden`, and while the table needs a scroller the wrapper is
 * too, which also counted the bubble's width into the scrollable area. Here
 * there is nothing to clip and nothing to measure: it works at every width,
 * opens on keyboard without any JS, and takes the seven `?` markers out of a
 * header row that has to stay scannable.
 */
export function ColumnGlossary({ items }: { items: ColumnNote[] }) {
  return (
    // Sits between the section head and the table, so it borders below only —
    // the head already draws the rule above it.
    <details className="group border-b border-hairline">
      {/* muted, not faint: this is the only control in the card and it has to
          read as one. faint is for labels that sit still. */}
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-[13px] font-medium text-muted transition-colors hover:text-holo">
        What these columns mean
        <svg
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        >
          <path
            d="m4 6.5 4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>

      {/*
        CSS columns, not a two-column grid. A grid ties every row to its tallest
        note and strands an odd last term beside a hole; columns let each entry
        take only its own height and balance the flow, so an odd count costs
        nothing. `break-inside-avoid` keeps a term with its note.
      */}
      <dl className="border-t border-hairline-soft px-5 py-4 text-[13px] leading-relaxed sm:columns-2 sm:gap-9 sm:[column-rule:1px_solid_var(--color-hairline)]">
        {items.map((item) => (
          <div
            key={item.term}
            className="mb-3.5 border-b border-hairline pb-3.5 break-inside-avoid"
          >
            <dt className="font-medium text-ink">{item.term}</dt>
            <dd className="mt-0.5 text-muted">{item.note}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
