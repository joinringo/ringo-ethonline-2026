/** Local stand-in for ringo-marketing's `cn` — the copied backdrops only ever
 *  join plain class strings, so clsx + tailwind-merge would be dead weight. */
export function cn(...inputs: (string | false | null | undefined)[]): string {
  return inputs.filter(Boolean).join(" ");
}
