import {Effect} from '..';
import {navigationRef} from '../../Root';
import {Analytics} from '../analytics/analytics.effects';
import {SwapCryptoPrefetchedData} from './swap-crypto.models';

let _prefetchedSwapData: SwapCryptoPrefetchedData | undefined;

export const getSwapCryptoPrefetchedData = ():
  | SwapCryptoPrefetchedData
  | undefined => _prefetchedSwapData;

export const setSwapCryptoPrefetchedData = (
  data: SwapCryptoPrefetchedData,
): void => {
  _prefetchedSwapData = data;
};

export const SWAP_CRYPTO_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

export const goToSwapCrypto = (): Effect<void> => dispatch => {
  dispatch(
    Analytics.track('Clicked Swap Crypto', {
      context: 'Shortcuts',
    }),
  );
  navigationRef.navigate('SwapCryptoRoot');
};
