const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/**
 * Converts a short duration string like "15m", "7d" or "30s" to milliseconds.
 * A bare number is treated as milliseconds. Throws on an unparseable value so
 * a misconfigured expiry surfaces at startup rather than silently defaulting.
 */
export function durationToMs(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d)?$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration: "${value}"`);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  return unit ? amount * UNIT_MS[unit] : amount;
}
