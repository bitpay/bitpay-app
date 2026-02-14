import {formatBigIntDecimal} from '../format';

/**
 * Converts an atomic bigint balance into a JS number in unit terms.
 *
 * Used for fiat calculations (unitsHeld * markRate) where we accept the limited
 * precision of Number for UI display. The conversion is string-based to avoid
 * Number() overflow where possible.
 */
export function atomicToUnitNumber(atomic: bigint, decimals: number): number {
  if (atomic === 0n) return 0;

  const s = formatBigIntDecimal(atomic, decimals, Math.min(decimals, 18));
  const v = Number(s);
  return Number.isFinite(v) ? v : 0;
}
