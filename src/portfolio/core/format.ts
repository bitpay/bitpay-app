import type {WalletCredentials} from './types';

export function normalizeNonNegativeInteger(value: number): number {
  'worklet';

  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

export function getAtomicDecimals(credentials: WalletCredentials): number {
  'worklet';

  const token = credentials?.token;
  if (token && typeof token.decimals === 'number') return token.decimals;

  const chain = String(
    credentials?.chain || credentials?.coin || '',
  ).toLowerCase();
  switch (chain) {
    case 'btc':
    case 'bch':
    case 'ltc':
    case 'doge':
      return 8;
    case 'eth':
    case 'matic':
    case 'arb':
    case 'base':
    case 'op':
      return 18;
    case 'xrp':
      return 6;
    case 'sol':
      return 9;
    default:
      // Fallback to satoshi-like.
      return 8;
  }
}

export function toSignificantStr(n: number, maxDecimals: number): string {
  'worklet';

  if (!Number.isFinite(n)) return '0';
  // Avoid scientific notation for common crypto ranges.
  const s = n.toFixed(Math.min(maxDecimals, 18));
  // Trim trailing zeros.
  return s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

export function parseScientificToTruncatedIntegerString(
  s: string,
): string | null {
  'worklet';

  const m = s
    .trim()
    .match(/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))[eE]([+-]?\d+)$/);
  if (!m) return null;

  const sign = m[1] === '-' ? '-' : '';
  const intPart = m[2] ?? '';
  const fracPart = m[3] ?? m[4] ?? '';
  const exp = Number(m[5]);
  if (!Number.isInteger(exp)) return null;

  const digits = intPart + fracPart;
  if (!digits || /^0+$/.test(digits)) return '0';

  const decimalPos = intPart.length + exp;
  if (decimalPos <= 0) return '0';

  const rawInt =
    decimalPos >= digits.length
      ? digits + '0'.repeat(decimalPos - digits.length)
      : digits.slice(0, decimalPos);

  const normalized = rawInt.replace(/^0+(?=\d)/, '');
  if (!normalized || /^0+$/.test(normalized)) return '0';
  return sign ? `${sign}${normalized}` : normalized;
}

export function parseAtomicToBigint(v: number | string | bigint): bigint {
  'worklet';

  if (typeof v === 'bigint') return v;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return 0n;

    // IMPORTANT:
    // Atomic-unit values (e.g. wei) frequently exceed Number.MAX_SAFE_INTEGER.
    // If we convert such numbers directly via BigInt(n) / BigInt(Math.trunc(n)),
    // we end up converting the underlying IEEE-754 value (which may differ by a
    // few units from the decimal value that was present in the JSON payload).
    //
    // Example (real-world): 109890109890109900 gets stored as an IEEE-754 value
    // that's actually 109890109890109904. BigInt(109890109890109900) becomes
    // 109890109890109904n and balance snapshots drift by a few wei.
    //
    // To keep our snapshot math consistent with how JSON/string values are
    // produced (JSON.stringify / String(n)), we convert via a decimal string
    // representation first.
    //
    // NOTE: If the number was already parsed by JSON.parse, any precision that
    // was lost there is unrecoverable. This just prevents *additional* drift
    // caused by BigInt(number) rounding differences.

    // Fast path for safe integers.
    if (Number.isSafeInteger(v)) return BigInt(v);

    // Prefer the JS "shortest round-trippable" decimal representation.
    // (This matches JSON.stringify/Number#toString behavior.)
    const s = String(v);

    // Handle scientific notation (Number#toString switches to it for >= 1e21).
    if (/[eE]/.test(s)) {
      const expanded = parseScientificToTruncatedIntegerString(s);
      if (expanded) return BigInt(expanded);
    }

    // Drop any fractional part defensively.
    const m = s.match(/^(-?\d+)(?:\.\d+)?$/);
    if (m) return BigInt(m[1]);

    // Fallback: last-resort truncation.
    return BigInt(Math.trunc(v));
  }
  const s = String(v).trim();
  if (!s) return 0n;
  // Handle scientific notation in strings (e.g. from user input).
  if (/[eE]/.test(s)) {
    const expanded = parseScientificToTruncatedIntegerString(s);
    if (expanded) return BigInt(expanded);
    const n = Number(s);
    if (!Number.isFinite(n)) return 0n;
    return BigInt(Math.trunc(n));
  }
  // Handle decimal strings defensively: drop fractional part if present.
  const m = s.match(/^(-?\d+)(?:\.(\d+))?$/);
  if (!m) throw new Error('Invalid atomic string');
  return BigInt(m[1]);
}

export function getPow10BigInt(decimals: number): bigint {
  'worklet';

  const normalized = normalizeNonNegativeInteger(decimals);
  return 10n ** BigInt(normalized);
}

export function makeAtomicToUnitNumberConverter(
  decimals: number,
  maxFractionDigits = 15,
): (atomic: bigint) => number {
  'worklet';

  const maxAtomicToUnitFractionDigits = 15;
  const normalizedDecimals = normalizeNonNegativeInteger(decimals);
  const fractionDigits = Math.min(
    normalizedDecimals,
    normalizeNonNegativeInteger(maxFractionDigits),
    maxAtomicToUnitFractionDigits,
  );
  const base = getPow10BigInt(normalizedDecimals);
  const fractionalDivisor =
    fractionDigits > 0
      ? getPow10BigInt(normalizedDecimals - fractionDigits)
      : 1n;
  const fractionalScale = fractionDigits > 0 ? 10 ** fractionDigits : 1;

  return (atomic: bigint): number => {
    'worklet';

    if (atomic === 0n) return 0;

    const sign = atomic < 0n ? -1 : 1;
    const abs = atomic < 0n ? -atomic : atomic;
    const whole = Number(abs / base);
    if (!Number.isFinite(whole)) return 0;

    let out = whole;
    if (fractionDigits > 0) {
      const fractional = Number((abs % base) / fractionalDivisor);
      if (!Number.isFinite(fractional)) return 0;
      out += fractional / fractionalScale;
    }

    return sign * out;
  };
}

export function ratioBigIntToNumber(n: bigint, d: bigint): number {
  'worklet';

  if (d === 0n) return 0;
  const ratioScale = 1_000_000_000_000n;
  const sign = n < 0n !== d < 0n ? -1 : 1;
  const an = n < 0n ? -n : n;
  const ad = d < 0n ? -d : d;
  const scaled = (an * ratioScale) / ad;
  const asNum = Number(scaled);
  return sign * (Number.isFinite(asNum) ? asNum / Number(ratioScale) : 0);
}

export function formatBigIntDecimal(
  atomic: bigint,
  decimals: number,
  maxDecimals = decimals,
  opts?: {trimTrailingZeros?: boolean},
): string {
  'worklet';

  const sign = atomic < 0n ? '-' : '';
  let abs = atomic < 0n ? -atomic : atomic;

  if (decimals <= 0) return sign + abs.toString();

  const base = getPow10BigInt(decimals);
  const whole = abs / base;
  let frac = (abs % base).toString().padStart(decimals, '0');

  // Trim or shorten fractional digits.
  const sliceTo = Math.max(0, Math.min(decimals, maxDecimals));
  frac = frac.slice(0, sliceTo);
  if (opts?.trimTrailingZeros !== false) {
    frac = frac.replace(/0+$/, '');
  }

  return frac ? `${sign}${whole.toString()}.${frac}` : sign + whole.toString();
}

export function formatAtomicAmount(
  atomic: number | string | bigint,
  credentials: WalletCredentials,
  opts?: {maxDecimals?: number},
): string {
  'worklet';

  const decimals = getAtomicDecimals(credentials);
  const maxDecimals = opts?.maxDecimals ?? decimals;

  // Prefer bigint-safe formatting (esp. for EVM 1e18 units), but keep a small
  // number fallback for environments where BigInt parsing could fail.
  try {
    const b = parseAtomicToBigint(atomic);
    return formatBigIntDecimal(b, decimals, maxDecimals);
  } catch {
    const asNum = typeof atomic === 'number' ? atomic : Number(String(atomic));
    const unit = Math.pow(10, decimals);
    return toSignificantStr(asNum / unit, maxDecimals);
  }
}
