import {SUPPORTED_COINS} from '../../../constants/currencies';

const chainSuffixMap: {[suffix: string]: string} = {
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
  if (suffix) {
    return {coin, chain: chainSuffixMap[suffix]};
  }
  if (SUPPORTED_COINS.includes(coin)) {
    return {coin, chain: coin};
  }
  return {coin, chain: 'eth'};
}

export function getCurrencyCodeFromCoinAndChain(
  coin: string,
  chain: string,
): string {
  if (coin.toLowerCase() === chain.toLowerCase()) {
    return coin.toUpperCase();
  }
  const matchingSuffixEntry = Object.entries(chainSuffixMap).find(
    ([_, chainCode]) => chain.toLowerCase() === chainCode,
  ) as [string, string];
  const suffix = matchingSuffixEntry && matchingSuffixEntry[0];
  const coinIsAnotherChain = Object.values(chainSuffixMap).find(
    chainCode => chainCode === coin.toLowerCase(),
  );
  if (suffix && (coinIsAnotherChain || chain.toLowerCase() !== 'eth')) {
    // Special handling for usdc.e and usdc
    if (coin.toLowerCase() === 'usdc.e') {
      return 'USDC_m';
    } else if (coin.toLowerCase() === 'usdc') {
      return 'USDCn_m';
    }
    return `${coin.toUpperCase()}_${suffix}`;
  }
  return coin.toUpperCase();
}
