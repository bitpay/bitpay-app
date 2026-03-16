import {Effect} from '..';
import {navigationRef} from '../../Root';
import {Analytics} from '../analytics/analytics.effects';
import {getExternalServicesConfig} from '../external-services/external-services.effects';
import {
  ExternalServicesConfigRequestParams,
  SwapCryptoConfig,
} from '../external-services/external-services.types';
import {changellyGetCurrencies} from './effects/changelly/changelly';
import {thorswapGetCurrencies} from './effects/thorswap/thorswap';
import {thorswapEnv} from '../../navigation/services/swap-crypto/utils/thorswap-utils';
import {setPrefetchedData} from './swap-crypto.actions';
import {logManager} from '../../managers/LogManager';

export const SWAP_CRYPTO_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const goToSwapCrypto = (): Effect<void> => dispatch => {
  dispatch(
    Analytics.track('Clicked Swap Crypto', {
      context: 'Shortcuts',
    }),
  );
  navigationRef.navigate('SwapCryptoRoot');
};

/**
 * Pre-fetches swap crypto config and exchange currencies in the background.
 * Results are stored in SWAP_CRYPTO.opts and used by SwapCryptoRoot to skip
 * network calls when the cache is fresh (< 24 hours).
 *
 * This effect is fire-and-forget — failures are silently ignored since
 * SwapCryptoRoot can always fall back to fetching on its own.
 */
export const prefetchSwapCryptoData =
  (): Effect<Promise<void>> => async (dispatch, getState) => {
    try {
      const {APP, LOCATION, BITPAY_ID, SWAP_CRYPTO} = getState();

      // Skip if cache is still fresh
      if (
        SWAP_CRYPTO.opts?.fetchedAt &&
        Date.now() - SWAP_CRYPTO.opts.fetchedAt < SWAP_CRYPTO_CACHE_TTL
      ) {
        logManager.debug('[prefetchSwapCrypto] Cache is still fresh, skipping');
        return;
      }

      const {network} = APP;
      const locationData = LOCATION.locationData;
      const user = BITPAY_ID.user[network];

      // 1. Fetch external services config
      const requestData: ExternalServicesConfigRequestParams = {
        currentLocationCountry: locationData?.countryShortCode,
        currentLocationState: locationData?.stateShortCode,
        bitpayIdLocationCountry: user?.country,
        bitpayIdLocationState: user?.state,
      };

      let swapCryptoConfig: SwapCryptoConfig | undefined;
      try {
        const config = await dispatch(getExternalServicesConfig(requestData));
        swapCryptoConfig = config?.swapCrypto;
      } catch (err) {
        logManager.debug(
          '[prefetchSwapCrypto] Config fetch failed, continuing with currencies only',
        );
      }

      // If swap is disabled, store config and stop
      if (swapCryptoConfig?.disabled) {
        dispatch(
          setPrefetchedData({
            swapCryptoConfig,
            fetchedAt: Date.now(),
          }),
        );
        return;
      }

      // 2. Determine which exchanges to fetch
      const fetchChangelly = !(
        swapCryptoConfig?.changelly?.removed ||
        swapCryptoConfig?.changelly?.disabled
      );
      const fetchThorswap = !(
        swapCryptoConfig?.thorswap?.removed ||
        swapCryptoConfig?.thorswap?.disabled
      );

      // 3. Fetch raw currencies in parallel
      const [changellyResult, thorswapResult] = await Promise.allSettled([
        fetchChangelly
          ? changellyGetCurrencies(true).then(data => data?.result)
          : Promise.resolve(undefined),
        fetchThorswap
          ? thorswapGetCurrencies({
              env: thorswapEnv,
              categories: 'all',
              includeDetails: true,
            })
          : Promise.resolve(undefined),
      ]);

      dispatch(
        setPrefetchedData({
          swapCryptoConfig,
          changellyRawCurrencies:
            changellyResult.status === 'fulfilled'
              ? changellyResult.value
              : undefined,
          thorswapRawCurrencies:
            thorswapResult.status === 'fulfilled'
              ? thorswapResult.value
              : undefined,
          fetchedAt: Date.now(),
        }),
      );

      logManager.debug('[prefetchSwapCrypto] Prefetch completed successfully');
    } catch (err) {
      // Silent fail — SwapCryptoRoot will fetch on its own
      logManager.debug(
        '[prefetchSwapCrypto] Prefetch failed: ' + JSON.stringify(err),
      );
    }
  };
