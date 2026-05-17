import type {WalletCredentials} from './types';

export {
  formatAtomicAmount,
  formatBigIntDecimal,
  getAtomicDecimals,
  getPow10BigInt,
  makeAtomicToUnitNumberConverter,
  normalizeNonNegativeInteger,
  parseAtomicToBigint,
  parseScientificToTruncatedIntegerString,
  ratioBigIntToNumber,
  resolveKnownWalletAtomicDecimals,
  resolveWalletAtomicDecimals,
  normalizeWalletUnitDecimals,
  toSignificantStr,
} from '../../../portfolio/core/format';

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
