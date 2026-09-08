import { Info } from "@/components/ui/info";

/**
 * A column note, shown only from `lg` up.
 *
 * Below that the table sits inside an `overflow-x-auto` scroller, and a
 * scroller is the one place this bubble cannot live: setting overflow on one
 * axis forces the other to `auto`, so the bubble is clipped vertically, and its
 * 248px width is counted into the scroller's scrollable area — which is why the
 * tables scrolled sideways into empty space. From `lg` the table fits without a
 * scroller (see the wrappers), so the bubble has somewhere to open.
 */
export function ColumnInfo({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <span className="hidden lg:inline">
      <Info align={align}>{children}</Info>
    </span>
  );
}
