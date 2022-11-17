import {SUPPORTED_COINS} from '../../../constants/currencies';

const chainSuffixMap: {[suffix: string]: string} = {
  eth: 'e',
  matic: 'm',
};

const suffixChainMap: {[suffix: string]: string} = {
  e: 'eth',
  m: 'matic',
};

export function getCoinAndChainFromCurrencyCode(currencyCode: string): {
  coin: string;
  chain: string;
} {
  const [coin, suffix] = currencyCode
    .split('_')
    .map(item => item.toLowerCase());
  return {coin, chain: suffix ? suffixChainMap[suffix] : coin};
}

export function getCurrencyCodeFromCoinAndChain(
  coin: string,
  chain: string,
): string {
  if (coin.toLowerCase() === chain.toLowerCase()) {
    return coin.toUpperCase();
  }
  const suffix = chainSuffixMap[chain.toLowerCase()];
  const coinIsAChain = !!chainSuffixMap[coin.toLowerCase()];
  if (suffix && (coinIsAChain || chain.toLowerCase() !== 'eth')) {
    return `${coin.toUpperCase()}_${suffix}`;
  }
  return coin.toUpperCase();
}
