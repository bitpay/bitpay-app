import {SUPPORTED_COINS} from '../../../constants/currencies';

export const chainSuffixMap: {[suffix: string]: string} = {
  e: 'eth',
  m: 'matic',
  arb: 'arb',
  base: 'base',
  op: 'op',
};

export function getCoinAndChainFromCurrencyCode(
  currencyCode: string,
  context?: string,
): {
  coin: string;
  chain: string;
} {
  const lastUnderscoreIndex = currencyCode.lastIndexOf('_');
  const coin =
    lastUnderscoreIndex >= 0
      ? currencyCode.slice(0, lastUnderscoreIndex).toLowerCase()
      : currencyCode.toLowerCase();
  const suffix =
    lastUnderscoreIndex >= 0
      ? currencyCode.slice(lastUnderscoreIndex + 1).toLowerCase()
      : undefined;

  if (coin === 'matic' && (!context || context !== 'buyCrypto')) {
    return {coin: 'pol', chain: 'matic'};
  }
  if (suffix) {
    if (!context || context !== 'buyCrypto') {
      // Special handling for usdc.e and usdc
      if (coin === 'usdc' && chainSuffixMap[suffix] === 'matic') {
        return {coin: 'usdc.e', chain: chainSuffixMap[suffix]};
      } else if (coin === 'usdcn' && chainSuffixMap[suffix] === 'matic') {
        return {coin: 'usdc', chain: chainSuffixMap[suffix]};
      } else if (coin === 'usdte' && chainSuffixMap[suffix] === 'arb') {
        return {coin: 'usdt', chain: chainSuffixMap[suffix]};
      } else if (coin === 'usdte' && chainSuffixMap[suffix] === 'op') {
        return {coin: 'usdt', chain: chainSuffixMap[suffix]};
      }
    }
    return {coin, chain: chainSuffixMap[suffix]};
  }

  if (SUPPORTED_COINS.includes(coin)) {
    return {coin, chain: coin};
  }

  return {coin, chain: coin === 'pol' ? 'matic' : 'eth'};
}

export function getCurrencyCodeFromCoinAndChain(
  coin: string,
  chain: string,
): string {
  if (coin.toLowerCase() === chain.toLowerCase()) {
    return coin.toUpperCase();
  }
  // TODO - remove this special case once migration to POL is complete
  if (coin.toLowerCase() === 'pol') {
    return 'MATIC';
  }
  if (coin.toLowerCase() === 'usdt' && chain.toLowerCase() === 'arb') {
    return 'USDTe_arb';
  }
  if (coin.toLowerCase() === 'usdt' && chain.toLowerCase() === 'op') {
    return 'USDTe_op';
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
    if (coin.toLowerCase() === 'usdc.e' && chain.toLowerCase() === 'matic') {
      return 'USDC_m';
    } else if (
      coin.toLowerCase() === 'usdc' &&
      chain.toLowerCase() === 'matic'
    ) {
      return 'USDCn_m';
    }
    return `${coin.toUpperCase()}_${suffix}`;
  }
  return coin.toUpperCase();
}
