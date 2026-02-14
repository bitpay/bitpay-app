import type {WalletCredentials} from './types';

const EVM_DECIMALS = 18;

export function getAtomicDecimals(credentials: WalletCredentials): number {
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
      return EVM_DECIMALS;
    case 'xrp':
      return 6;
    case 'sol':
      return 9;
    default:
      // Fallback to satoshi-like.
      return 8;
  }
}

function toSignificantStr(n: number, maxDecimals: number): string {
  if (!Number.isFinite(n)) return '0';
  // Avoid scientific notation for common crypto ranges.
  const s = n.toFixed(Math.min(maxDecimals, 18));
  // Trim trailing zeros.
  return s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

const SCI_NUMBER_RE = /^(-?)(?:(\d+)(?:\.(\d*))?|\.(\d+))[eE]([+-]?\d+)$/;
const DECIMAL_NUMBER_RE = /^(-?\d+)(?:\.\d+)?$/;
const POW10_BIGINT_CACHE: bigint[] = [1n];

function normalizeIntString(sign: string, digits: string): string {
  const normalized = digits.replace(/^0+/, '') || '0';
  return sign && normalized !== '0' ? `-${normalized}` : normalized;
}

function expandScientificToIntString(s: string): string | null {
  const m = s.match(SCI_NUMBER_RE);
  if (!m) return null;

  const sign = m[1];
  const whole = m[2] ?? '';
  const frac = m[3] ?? m[4] ?? '';
  const exp = Number(m[5]);
  if (!Number.isInteger(exp)) return null;

  const digits = `${whole}${frac}`;
  if (!digits || /^0+$/.test(digits)) return '0';

  const decimalIndex = whole.length + exp;
  if (decimalIndex <= 0) return '0';

  const intDigits =
    decimalIndex >= digits.length
      ? digits + '0'.repeat(decimalIndex - digits.length)
      : digits.slice(0, decimalIndex);

  return normalizeIntString(sign, intDigits);
}

function tryParseAtomicToBigint(v: number | string | bigint): bigint | null {
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
    if (/[eE]/.test(s)) {
      const expanded = expandScientificToIntString(s);
      if (expanded != null) return BigInt(expanded);
    }

    // Drop any fractional part defensively.
    const m = s.match(DECIMAL_NUMBER_RE);
    if (m) return BigInt(m[1]);

    // Fallback: last-resort truncation.
    return BigInt(Math.trunc(v));
  }

  const s = String(v).trim();
  if (!s) return 0n;

  // Handle scientific notation in strings (e.g. from user input).
  if (/[eE]/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return 0n;
    return tryParseAtomicToBigint(n);
  }

  // Handle decimal strings defensively: drop fractional part if present.
  const m = s.match(DECIMAL_NUMBER_RE);
  if (!m) return null;
  return BigInt(m[1]);
}

export function formatAtomicAmount(
  atomic: number | string | bigint,
  credentials: WalletCredentials,
  opts?: {maxDecimals?: number},
): string {
  const decimals = getAtomicDecimals(credentials);
  const maxDecimals = opts?.maxDecimals ?? decimals;

  // Prefer bigint-safe formatting (esp. for EVM 1e18 units), but keep a small
  // number fallback for environments where BigInt parsing could fail.
  const b = tryParseAtomicToBigint(atomic);
  if (b !== null) {
    return formatBigIntDecimal(b, decimals, maxDecimals);
  }

  const asNum = typeof atomic === 'number' ? atomic : Number(String(atomic));
  const unit = Math.pow(10, decimals);
  return toSignificantStr(asNum / unit, maxDecimals);
}

export function parseAtomicToBigint(v: number | string | bigint): bigint {
  const parsed = tryParseAtomicToBigint(v);
  if (parsed !== null) return parsed;
  throw new Error('Invalid atomic string');
}

function pow10BigInt(decimals: number): bigint {
  if (!Number.isFinite(decimals)) return 1n;
  if (!Number.isInteger(decimals) || decimals < 0) {
    let out = 1n;
    for (let i = 0; i < decimals; i++) out *= 10n;
    return out;
  }

  for (let i = POW10_BIGINT_CACHE.length; i <= decimals; i++) {
    POW10_BIGINT_CACHE[i] = POW10_BIGINT_CACHE[i - 1] * 10n;
  }
  return POW10_BIGINT_CACHE[decimals];
}

export function formatBigIntDecimal(
  atomic: bigint,
  decimals: number,
  maxDecimals = decimals,
): string {
  const sign = atomic < 0n ? '-' : '';
  let abs = atomic < 0n ? -atomic : atomic;

  if (decimals <= 0) return sign + abs.toString();

  const base = pow10BigInt(decimals);
  const whole = abs / base;
  let frac = (abs % base).toString().padStart(decimals, '0');

  // Trim or shorten fractional digits.
  const sliceTo = Math.max(0, Math.min(decimals, maxDecimals));
  frac = frac.slice(0, sliceTo);
  frac = frac.replace(/0+$/, '');

  return frac ? `${sign}${whole.toString()}.${frac}` : sign + whole.toString();
}

export function formatChainAndNetwork(credentials: WalletCredentials): string {
  const chain = String(
    credentials?.chain || credentials?.coin || '',
  ).toUpperCase();
  const network = String(credentials?.network || '').toLowerCase();
  const niceNetwork = network === 'livenet' ? 'mainnet' : network || 'unknown';
  return `${chain}/${niceNetwork}`;
}

export function formatWalletId(walletId: string, max = 10): string {
  if (walletId.length <= max) return walletId;
  return `${walletId.slice(0, 6)}…${walletId.slice(-4)}`;
}

export function formatUnixTimeSecondsToLocal(tsSeconds?: number): string {
  if (!tsSeconds || !Number.isFinite(tsSeconds)) return '';
  const d = new Date(tsSeconds * 1000);
  return d.toLocaleString();
}

export function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}
