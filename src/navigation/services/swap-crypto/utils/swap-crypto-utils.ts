import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {SwapCryptoCoin} from '../screens/SwapCryptoRoot';

export type SwapCryptoExchangeKey = 'changelly' | 'thorswap';

export const SwapCryptoSupportedExchanges: SwapCryptoExchangeKey[] = [
  'changelly',
  'thorswap',
];

export const isPairSupported = (
  // TODO: finish this function
  exchange: SwapCryptoExchangeKey,
  coinFrom: string,
  chainFrom: string,
  coinTo: string,
  chainTo: string,
  supportedCoins: SwapCryptoCoin[] | undefined,
  country?: string,
): boolean => {
  if (!supportedCoins) {
    return false;
  }

  const symbolFrom = getCurrencyAbbreviation(coinFrom, chainFrom);
  const symbolTo = getCurrencyAbbreviation(coinTo, chainTo);

  if (
    supportedCoins.find(c => c.symbol === symbolFrom) &&
    supportedCoins.find(c => c.symbol === symbolTo)
  ) {
    return true;
  } else {
    return false;
  }
};
