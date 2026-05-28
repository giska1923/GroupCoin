/**
 * Money helpers — all arithmetic is done in integer cents to avoid the
 * classic floating-point pitfalls of summing decimal amounts (e.g.
 * 0.1 + 0.2 !== 0.3). DECIMAL columns from node-postgres arrive as strings,
 * which we convert here.
 *
 * Supported precision: 2 decimal places (matches DECIMAL(12, 2) in the schema).
 */

const CENTS_PER_UNIT = 100;

export const toCents = (amount: string | number): number => {
  const num = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(num)) {
    throw new Error(`Invalid monetary amount: ${amount}`);
  }
  // Multiply first, then round to dodge representation errors like 1.005 -> 100.49999
  return Math.round(num * CENTS_PER_UNIT);
};

export const fromCents = (cents: number): string => {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / CENTS_PER_UNIT);
  const remainder = abs % CENTS_PER_UNIT;
  return `${negative ? '-' : ''}${dollars}.${String(remainder).padStart(2, '0')}`;
};

/**
 * Divide `totalCents` into `n` shares as evenly as possible while preserving
 * the exact total. Leftover cents (`totalCents mod n`) are distributed one
 * per share starting from index 0, so the sum of the result always equals
 * `totalCents`.
 *
 * Example: splitEqually(1000, 3) => [334, 333, 333]
 */
export const splitEqually = (totalCents: number, n: number): number[] => {
  if (n <= 0) {
    throw new Error('Cannot split into zero or fewer participants');
  }
  const sign = totalCents < 0 ? -1 : 1;
  const abs = Math.abs(totalCents);
  const base = Math.floor(abs / n);
  const remainder = abs - base * n;
  return Array.from({ length: n }, (_, i) =>
    sign * (i < remainder ? base + 1 : base),
  );
};
