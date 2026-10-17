import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {SwapCryptoCoin} from '../screens/SwapCryptoRoot';
import {isCoinSupportedByChangelly} from './changelly-utils';
import {
  isCoinSupportedByRango,
  rangoCanSwapFromChain,
  RANGO_EXECUTION_ENABLED,
} from './rango-utils';
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
  // Rango participates only when execution is enabled: this gates the Swap
  // entry point, so advertising a provider that cannot execute would offer a
  // swap the user is unable to finish.
  return (
    isCoinSupportedBy('changelly', coin, chain) ||
    (RANGO_EXECUTION_ENABLED && isCoinSupportedBy('rango', coin, chain)) ||
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

  // Rango is the only provider whose support is not symmetric: it can deliver
  // to a chain it cannot spend from. Checked before the symbol lookups below,
  // which treat both sides the same way.
  if (exchange === 'rango' && !rangoCanSwapFromChain(chainFrom)) {
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
