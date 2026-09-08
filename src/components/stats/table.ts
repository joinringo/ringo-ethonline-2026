/**
 * Header and cell without horizontal padding. A column that splits into two
 * table columns has to set its own gutter, and appending `pl-4`/`pr-4` to a
 * class that already carries `px-4` leaves two utilities fighting over the same
 * property, decided by their order in the generated stylesheet rather than by
 * the order they are written in.
 */
/* Tracking below the 0.08em this carried for Inter: a mono already ships wide
   side bearings, so the same value reads as a gap rather than as spacing. */
export const HEAD_V =
  "font-label py-3 text-micro tracking-[0.05em] whitespace-nowrap text-faint uppercase";

export const TH = `px-4 ${HEAD_V}`;

/**
 * Baseline, not middle. Some cells carry a rail under their figure — Volume in
 * both tables, Staked in the markets one — and `align-middle` centres each
 * cell's own content box, so a one-line cell sits ~4px lower than the first
 * line of a two-line one. Dates and addresses came out visibly below the figure
 * beside them, right across the row. Baseline is the cell default for a reason:
 * every cell's first line lands on one line, and the rails hang off it.
 */
export const CELL_V = "py-3.5 align-baseline";

export const TD = `px-4 ${CELL_V}`;

export const ROW =
  "border-b border-hairline-soft transition-colors duration-150 last:border-0 hover:bg-raised/45";

export const RANK = `${TD} tnum text-micro text-faint`;

export const POLYGONSCAN = "https://polygonscan.com/address/";
