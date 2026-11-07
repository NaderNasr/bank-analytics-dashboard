/**
 * Exponential backoff with "full jitter": a random delay between 0 and min(max, base·2^attempt).
 * Jitter stops many clients that dropped together from reconnecting in lockstep.
 */
export function backoffDelay(
  attempt: number,
  {
    base = 500,
    max = 15_000,
    random = Math.random,
  }: { base?: number; max?: number; random?: () => number } = {},
): number {
  const ceiling = Math.min(max, base * 2 ** Math.max(0, attempt));
  return Math.round(ceiling * random());
}
