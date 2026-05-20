import axios from 'axios';
import {Platform} from 'react-native';
import {Effect} from '..';
import {APP_VERSION, BASE_BWS_URL} from '../../constants/config';
import {
  ExternalServicesConfig,
  SwapCryptoConfig,
} from './external-services.types';
import {logManager} from '../../managers/LogManager';
import {
  getSwapCryptoPrefetchedData,
  setSwapCryptoPrefetchedData,
  SWAP_CRYPTO_CACHE_TTL,
} from '../swap-crypto/swap-crypto.effects';
import {changellyGetCurrencies} from '../swap-crypto/effects/changelly/changelly';
import {thorswapGetCurrencies} from '../swap-crypto/effects/thorswap/thorswap';
import {thorswapEnv} from '../../navigation/services/swap-crypto/utils/thorswap-utils';

const bwsUri = BASE_BWS_URL;

// ---------------------------------------------------------------------------
// Module-level cache for ExternalServicesConfig.
// Fetched once during app init (prefetchExternalServicesData) and reused by
// SwapCryptoRoot, BuyAndSellRoot, etc. to avoid redundant network calls.
// The cache lives in memory only — same lifecycle as the app process.
// ---------------------------------------------------------------------------
export const EXTERNAL_SERVICES_CONFIG_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

interface CachedExternalServicesConfig {
  config: ExternalServicesConfig;
  fetchedAt: number;
}

let _cachedConfig: CachedExternalServicesConfig | undefined;

/** Read the cached external services config (may be undefined). */
export const getCachedExternalServicesConfig = ():
  | CachedExternalServicesConfig
  | undefined => _cachedConfig;

/** Write a new cached config. */
export const setCachedExternalServicesConfig = (
  config: ExternalServicesConfig,
  fetchedAt: number = Date.now(),
): void => {
  _cachedConfig = {config, fetchedAt};
};

/** Check whether the cached config is still fresh. */
export const isExternalServicesConfigCacheFresh = (): boolean =>
  !!_cachedConfig?.fetchedAt &&
  Date.now() - _cachedConfig.fetchedAt < EXTERNAL_SERVICES_CONFIG_CACHE_TTL;

export const getExternalServicesConfig =
  (): Effect<Promise<any>> =>
  async (dispatch, getState): Promise<any> => {
    try {
      const {APP, LOCATION, BITPAY_ID} = getState();
      const locationData = LOCATION.locationData;
      const user = BITPAY_ID.user[APP.network];

      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
        params: {
          currentAppVersion: APP_VERSION,
          currentLocationCountry: locationData?.countryShortCode,
          currentLocationState: locationData?.stateShortCode,
          bitpayIdLocationCountry: user?.country,
          bitpayIdLocationState: user?.state,
          platform: {
            os: Platform.OS,
            version: Platform.Version,
          },
        },
      };

      logManager.debug(
        `Getting external services config with params: ${JSON.stringify(
          config.params,
        )}`,
      );
      const {data} = await axios.get(bwsUri + '/v1/services', config);

      // Update module-level cache on every successful fetch
      if (data) {
        setCachedExternalServicesConfig(data);
      }

      return Promise.resolve(data);
    } catch (err) {
      return Promise.reject(err);
    }
  };

/**
 * Pre-fetches external services config and swap crypto exchange currencies
 * in the background. The config is cached at the module level here
 * (shared with BuyAndSellRoot) and the swap currency data is cached in
 * swap-crypto.effects.ts (_prefetchedSwapData).
 *
 * This effect is fire-and-forget — failures are silently ignored since
 * consumers can always fall back to fetching on their own.
 */
export const prefetchExternalServicesData =
  (): Effect<Promise<void>> => async dispatch => {
    try {
      let swapCryptoConfig: SwapCryptoConfig | undefined;
      if (isExternalServicesConfigCacheFresh()) {
        swapCryptoConfig =
          getCachedExternalServicesConfig()?.config?.swapCrypto;
        logManager.debug('[prefetchExternalServices] Using cached config');
      } else {
        try {
          const config = await dispatch(getExternalServicesConfig());
          swapCryptoConfig = config?.swapCrypto;
        } catch (err) {
          logManager.debug(
            '[prefetchExternalServices] Config fetch failed, continuing with currencies only',
          );
        }
      }

      // Skip if swap cache is still fresh
      const prefetchedSwapData = getSwapCryptoPrefetchedData();
      if (
        prefetchedSwapData?.fetchedAt &&
        Date.now() - prefetchedSwapData.fetchedAt < SWAP_CRYPTO_CACHE_TTL
      ) {
        logManager.debug('[prefetchSwapCrypto] Cache is still fresh, skipping');
        return;
      }

      // If swap is disabled, save config and stop
      if (swapCryptoConfig?.disabled) {
        setSwapCryptoPrefetchedData({
          swapCryptoConfig,
          fetchedAt: Date.now(),
        });
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

      setSwapCryptoPrefetchedData({
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
      });

      logManager.debug(
        '[prefetchExternalServices] Prefetch completed successfully',
      );
    } catch (err) {
      // Silent fail — consumers will fetch on their own
      logManager.debug(
        '[prefetchExternalServices] Prefetch failed: ' + JSON.stringify(err),
      );
    }
  };

export const getSpenderApprovalWhitelist =
  (): Effect<Promise<any>> =>
  async (dispatch): Promise<any> => {
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
      };

      logManager.debug('Getting spender approval white list');
      const {data} = await axios.get(
        bwsUri + '/v1/services/dex/getSpenderApprovalWhitelist',
        config,
      );
      return Promise.resolve(data);
    } catch (err) {
      return Promise.reject(err);
    }
  };
