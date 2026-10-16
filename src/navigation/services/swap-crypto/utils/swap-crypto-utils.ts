import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {SwapCryptoCoin} from '../screens/SwapCryptoRoot';
import {isCoinSupportedByChangelly} from './changelly-utils';
import {isCoinSupportedByRango} from './rango-utils';
import {isCoinSupportedByThorswap} from './thorswap-utils';

export type SwapCryptoExchangeKey = 'changelly' | 'rango' | 'thorswap';

export const SwapCryptoSupportedExchanges: SwapCryptoExchangeKey[] = [
  'changelly',
  'rango',
  'thorswap',
];

export const isCoinSupportedToSwap = (
  coin: string,
  chain: string,
  country?: string,
): boolean => {
  // Rango is intentionally excluded here while its offer is gated off. This
  // gates the Swap entry point, so including a provider that cannot execute
  // would advertise a swap the user cannot complete. Add it back in the same
  // PR that flips showOffer to true.
  return (
    isCoinSupportedBy('changelly', coin, chain) ||
    isCoinSupportedBy('thorswap', coin, chain)
  );
};

const isCoinSupportedBy = (
  exchange: string,
  coin: string,
  chain: string,
): boolean => {
  switch (exchange) {
    case 'changelly':
      return isCoinSupportedByChangelly(
        coin.toLowerCase(),
        chain.toLowerCase(),
      );
    case 'rango':
      return isCoinSupportedByRango(coin.toLowerCase(), chain.toLowerCase());
    case 'thorswap':
      return isCoinSupportedByThorswap(coin.toLowerCase(), chain.toLowerCase());
    default:
      return false;
  }
};

export const isPairSupported = (
  exchange: SwapCryptoExchangeKey,
  coinFrom: string,
  chainFrom: string,
  coinTo: string,
  chainTo: string,
  supportedCoins?: SwapCryptoCoin[] | undefined,
  country?: string,
): boolean => {
  if (!exchange && !supportedCoins) {
    return false;
  }

  const symbolFrom = getCurrencyAbbreviation(coinFrom, chainFrom);
  const symbolTo = getCurrencyAbbreviation(coinTo, chainTo);

  if (exchange && supportedCoins && supportedCoins.length > 0) {
    return !!(
      supportedCoins.find(c => c.symbol === symbolFrom) &&
      supportedCoins.find(c => c.symbol === symbolTo)
    );
  } else if (exchange) {
    return (
      isCoinSupportedBy(exchange, coinFrom, chainFrom) &&
      isCoinSupportedBy(exchange, coinTo, chainTo)
    );
  } else if (supportedCoins) {
    return !!(
      supportedCoins.find(c => c.symbol === symbolFrom) &&
      supportedCoins.find(c => c.symbol === symbolTo)
    );
  } else {
    return false;
  }
};

export const calculateSlippageMinAmount = (
  originalAmount: string | number,
  slippage: number,
) => {
  const minAmount = Number(originalAmount) / (1 + slippage * 0.01);
  return minAmount;
};
