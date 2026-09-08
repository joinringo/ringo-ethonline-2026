export const TH =
  "px-4 py-3 text-[11px] font-medium tracking-[0.08em] whitespace-nowrap text-faint uppercase";

const CELL = "px-4 py-3.5";

/**
 * Baseline, not middle. Some cells carry a rail under their figure — Volume in
 * both tables, Staked in the markets one — and `align-middle` centres each
 * cell's own content box, so a one-line cell sits ~4px lower than the first
 * line of a two-line one. Dates and addresses came out visibly below the figure
 * beside them, right across the row. Baseline is the cell default for a reason:
 * every cell's first line lands on one line, and the rails hang off it.
 */
export const TD = `${CELL} align-baseline`;

export const ROW =
  "border-b border-hairline-soft transition-colors duration-150 last:border-0 hover:bg-raised/45";

export const RANK = `${TD} tnum text-[12px] text-faint`;

export const POLYGONSCAN = "https://polygonscan.com/address/";
