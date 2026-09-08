const USDC_DECIMALS = 6n;
const USDC_SCALE = 10n ** USDC_DECIMALS;

/**
 * USDC amounts arrive as raw integer strings with 6 decimals. Parsing them
 * through Number loses precision above ~9 billion units, so the split happens
 * in bigint and only the small remainder becomes a number.
 */
export function formatUsdc(
  raw: bigint | string,
  options: { decimals?: number } = {}
): string {
  const value = typeof raw === "string" ? BigInt(raw) : raw;
  const decimals = options.decimals ?? 2;

  const negative = value < 0n;
  const absolute = negative ? -value : value;

  const whole = absolute / USDC_SCALE;
  const fraction = absolute % USDC_SCALE;

  const fractionText = fraction
    .toString()
    .padStart(Number(USDC_DECIMALS), "0")
    .slice(0, decimals);

  const wholeText = whole.toLocaleString("en-US");
  const sign = negative ? "-" : "";

  return decimals > 0 ? `${sign}${wholeText}.${fractionText}` : `${sign}${wholeText}`;
}

/** Compact form for headline figures: 1.2M, 48.3k. */
export function formatUsdcCompact(raw: bigint | string): string {
  const value = typeof raw === "string" ? BigInt(raw) : raw;
  const units = Number(value / USDC_SCALE);

  if (units >= 1_000_000) return `${(units / 1_000_000).toFixed(2)}M`;
  if (units >= 1_000) return `${(units / 1_000).toFixed(1)}k`;
  return units.toLocaleString("en-US");
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

export function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatDate(unixSeconds: string | number): string {
  const seconds =
    typeof unixSeconds === "string" ? Number(unixSeconds) : unixSeconds;
  return new Date(seconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Axis labels on the activity chart: "Sep 7", no year, always UTC. */
export function formatDayLabel(unixSeconds: string | number): string {
  const seconds =
    typeof unixSeconds === "string" ? Number(unixSeconds) : unixSeconds;
  return new Date(seconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Distance from now in whole UTC days. Used for freshness, where "2d ago" is
 * the thing a reader wants and the exact date is not.
 */
export function formatRelativeDay(unixSeconds: string | number): string {
  const seconds =
    typeof unixSeconds === "string" ? Number(unixSeconds) : unixSeconds;
  const days = Math.floor((Date.now() / 1000 - seconds) / 86_400);

  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return formatDate(seconds);
}

/**
 * Fee take as a percentage of settled volume. Kept in bigint until the last
 * step so a large lifetime volume cannot round the rate away.
 */
export function formatRate(part: bigint, whole: bigint): string | null {
  if (whole <= 0n) return null;
  const basisPoints = Number((part * 10_000n) / whole);
  return `${(basisPoints / 100).toFixed(2)}%`;
}

/**
 * Sentence case for a claim, first letter only.
 *
 * Claims arrive from the contract as the user typed them, which is almost
 * always lower case — "apple announces a new iphone product in 1 hour". This
 * is presentation, not a correction: the rest of the string is left exactly as
 * written, so a claim that starts with a figure or a symbol is untouched.
 */
export function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
