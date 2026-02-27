import {Effect} from '../../../index';
import axios from 'axios';
import {BASE_BWS_URL} from '../../../../constants/config';
import {SUPPORTED_VM_TOKENS} from '../../../../constants/currencies';
import {
  FiatRatePoint,
  FiatRateSeriesCache,
  FiatRateInterval,
  FIAT_RATE_SERIES_CACHED_INTERVALS,
  HistoricRate,
  Rate,
  Rates,
  getFiatRateSeriesCacheKey,
  hasValidSeriesForCoin,
} from '../../../rate/rate.models';
import {isCacheKeyStale} from '../../utils/wallet';
import {
  HISTORIC_RATES_CACHE_DURATION,
  RATES_CACHE_DURATION,
} from '../../../../constants/wallet';
import {DEFAULT_DATE_RANGE} from '../../../../constants/rate';
import {
  failedGetRates,
  pruneFiatRateSeriesCache,
  successGetRates,
  upsertFiatRateSeriesCache,
  updateCacheKey,
} from '../../../rate/rate.actions';
import {CacheKeys} from '../../../rate/rate.models';
import moment from 'moment';
import {addAltCurrencyList} from '../../../app/app.actions';
import {AltCurrenciesRowProps} from '../../../../components/list/AltCurrenciesRow';
import {BitpaySupportedTokenOptsByAddress} from '../../../../constants/tokens';
import {
  addTokenChainSuffix,
  getLastDayTimestampStartOfHourMs,
  getErrorString,
} from '../../../../utils/helper-methods';
import {
  getMultipleTokenPrices,
  UnifiedTokenPriceObj,
} from '../../../../store/moralis/moralis.effects';
import {calculateUsdToAltFiat} from '../../../../store/buy-crypto/buy-crypto.effects';
import {IsERCToken} from '../../utils/currency';
import {UpdateAllKeyAndWalletStatusContext} from '../status/status';
import {tokenManager} from '../../../../managers/TokenManager';
import {logManager} from '../../../../managers/LogManager';
import type {Key, Wallet} from '../../wallet.models';
import {normalizeFiatRateSeriesCoin} from '../../../../utils/portfolio/core/pnl/rates';
import {isSortedByTsAsc} from '../../../../utils/portfolio/timeSeries';

const FIAT_RATE_SERIES_BASE_URL = `${BASE_BWS_URL}/v4/fiatrates`;

const FIAT_RATE_SERIES_INTERVAL_DAYS: Record<
  FiatRateInterval,
  number | undefined
> = {
  '1D': 1,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
  '5Y': 1825,
  ALL: undefined,
};

const getFiatRateSeriesUrl = (
  fiatCode: string,
  interval: FiatRateInterval,
  coin?: string,
  chain?: string,
  tokenAddress?: string,
): string => {
  const days = FIAT_RATE_SERIES_INTERVAL_DAYS[interval];
  const codeUpper = (fiatCode || 'USD').toUpperCase();
  const normalizedCoin = normalizeFiatRateSeriesCoin(coin).trim();
  const normalizedChain = (chain || '').trim();
  const normalizedTokenAddress = (tokenAddress || '').trim();
  const coinQuery = normalizedCoin
    ? `coin=${encodeURIComponent(normalizedCoin)}`
    : '';
  const chainQuery =
    normalizedCoin && normalizedChain
      ? `&chain=${encodeURIComponent(normalizedChain)}`
      : '';
  const tokenAddressQuery =
    normalizedCoin && normalizedTokenAddress
      ? `&tokenAddress=${encodeURIComponent(normalizedTokenAddress)}`
      : '';
  if (!days) {
    return coinQuery
      ? `${FIAT_RATE_SERIES_BASE_URL}/${codeUpper}?${coinQuery}${chainQuery}${tokenAddressQuery}`
      : `${FIAT_RATE_SERIES_BASE_URL}/${codeUpper}`;
  }
  return coinQuery
    ? `${FIAT_RATE_SERIES_BASE_URL}/${codeUpper}?days=${days}&${coinQuery}${chainQuery}${tokenAddressQuery}`
    : `${FIAT_RATE_SERIES_BASE_URL}/${codeUpper}?days=${days}`;
};

const hasValidFiatRateSeriesInCache = (args: {
  fiatRateSeriesCache: FiatRateSeriesCache;
  fiatCode: string;
  coin: string;
  interval: FiatRateInterval;
  requireFresh?: boolean;
}): boolean => {
  const hasValidSeries = hasValidSeriesForCoin({
    cache: args.fiatRateSeriesCache,
    fiatCodeUpper: args.fiatCode,
    normalizedCoin: args.coin,
    intervals: [args.interval],
  });
  if (!hasValidSeries) {
    return false;
  }
  if (!args.requireFresh) {
    return true;
  }

  const cacheKey = getFiatRateSeriesCacheKey(
    args.fiatCode,
    args.coin,
    args.interval,
  );
  const fetchedOn = args.fiatRateSeriesCache?.[cacheKey]?.fetchedOn;
  return (
    typeof fetchedOn === 'number' &&
    !isCacheKeyStale(fetchedOn, HISTORIC_RATES_CACHE_DURATION)
  );
};

const getFiatRateSeriesCadenceMs = (
  points: FiatRatePoint[],
  interval: FiatRateInterval,
): number => {
  if (points.length >= 2) {
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    const delta = last.ts - prev.ts;
    if (Number.isFinite(delta) && delta > 0) {
      return delta;
    }
  }

  switch (interval) {
    case '1D':
      return 15 * 60 * 1000;
    case '1W':
      return 2 * 60 * 60 * 1000;
    case '1M':
      return 6 * 60 * 60 * 1000;
    case '3M':
    case '1Y':
    case '5Y':
    case 'ALL':
    default:
      return 24 * 60 * 60 * 1000;
  }
};

const dedupeFiatRatePointsByTs = (points: FiatRatePoint[]): FiatRatePoint[] => {
  const seen = new Set<number>();
  const out: FiatRatePoint[] = [];
  for (const p of points) {
    if (!p || typeof p.ts !== 'number') {
      continue;
    }
    if (seen.has(p.ts)) {
      continue;
    }
    seen.add(p.ts);
    out.push(p);
  }
  return out;
};

const coerceV4FiatRatesPayloadToByCoin = (
  data: unknown,
  normalizedRequestedCoin?: string,
): Record<string, unknown> => {
  if (!data || typeof data !== 'object') {
    return {};
  }
  if (Array.isArray(data)) {
    if (!normalizedRequestedCoin) {
      return {};
    }
    return {[normalizedRequestedCoin]: data};
  }
  return data as Record<string, unknown>;
};

const sanitizeSortDedupePoints = (rawPoints: unknown): FiatRatePoint[] => {
  if (!Array.isArray(rawPoints) || !rawPoints.length) {
    return [];
  }

  const filtered = rawPoints
    .map(point => {
      const p = point as FiatRatePoint | Record<string, unknown> | undefined;
      return {
        ts: Number((p as any)?.ts),
        rate: Number((p as any)?.rate),
      } as FiatRatePoint;
    })
    .filter(p => Number.isFinite(p?.ts) && Number.isFinite(p?.rate));

  if (!filtered.length) {
    return [];
  }

  let points = filtered.map(p => ({ts: p.ts, rate: p.rate}));
  if (!isSortedByTsAsc(points)) {
    points = points.sort((a, b) => a.ts - b.ts);
  }
  return dedupeFiatRatePointsByTs(points);
};

const fiatRateSeriesRequestsInFlightByKey = new Map<string, Promise<void>>();

const getFiatRateSeriesInFlightKey = (args: {
  fiatCode: string;
  interval: FiatRateInterval;
  coin?: string;
}): string => {
  const fiatCodeUpper = (args.fiatCode || '').toUpperCase();
  const normalizedCoin = normalizeFiatRateSeriesCoin(args.coin);
  // Default v4 requests are shared across callers regardless of target coin.
  if (!normalizedCoin) {
    return `${fiatCodeUpper}:${args.interval}:default`;
  }
  return `${fiatCodeUpper}:${normalizedCoin}:${args.interval}:coin`;
};

const getAllowedCoinsSet = (allowedCoins?: string[]): Set<string> | null => {
  if (!Array.isArray(allowedCoins)) {
    return null;
  }

  const set = new Set(
    allowedCoins.map(c => normalizeFiatRateSeriesCoin(c)).filter(Boolean),
  );
  // Defensive bridge invariant: BTC should always remain fetchable when a
  // caller opts into coin-restricted responses.
  set.add('btc');
  return set;
};

export const startGetRates =
  ({
    context,
    force,
  }: {
    context?: UpdateAllKeyAndWalletStatusContext;
    force?: boolean;
  }): Effect<Promise<Rates>> =>
  async (dispatch, getState) => {
    return new Promise(async resolve => {
      logManager.info('startGetRates: starting...');
      const {
        RATE: {ratesCacheKey, rates: cachedRates},
        APP: {altCurrencyList},
      } = getState();
      if (
        !isCacheKeyStale(
          ratesCacheKey[DEFAULT_DATE_RANGE],
          RATES_CACHE_DURATION,
        ) &&
        !force &&
        altCurrencyList.length > 0
      ) {
        logManager.info('startGetRates: success (using cached rates)');
        return resolve(cachedRates);
      }

      dispatch(updateCacheKey({cacheKey: CacheKeys.RATES}));

      try {
        logManager.info('startGetRates: fetching new rates...');
        const yesterday = getLastDayTimestampStartOfHourMs();

        logManager.info(
          `startGetRates: get request to: ${BASE_BWS_URL}/v3/fiatrates/`,
        );
        const {data: rates} = await axios.get(`${BASE_BWS_URL}/v3/fiatrates/`);
        logManager.info('startGetRates: success get request');

        logManager.info(
          `startGetRates: get request (yesterday) to: ${BASE_BWS_URL}/v3/fiatrates?ts=${yesterday}`,
        );
        const {data: lastDayRates} = await axios.get(
          `${BASE_BWS_URL}/v3/fiatrates?ts=${yesterday}`,
        );
        logManager.info('startGetRates: success get request (yesterday)');

        if (context === 'init' || altCurrencyList.length === 0) {
          logManager.info('startGetRates: setting alternative currency list');
          // set alternative currency list
          const alternatives: Array<AltCurrenciesRowProps> = [];
          rates.btc.forEach((r: Rate) => {
            if (r.code && r.name) {
              alternatives.push({isoCode: r.code, name: r.name});
            }
          });
          alternatives.sort((a, b) => (a.name < b.name ? -1 : 1));
          dispatch(addAltCurrencyList(alternatives));
          logManager.info(
            'startGetRates: success set alternative currency list',
          );
        }

        // needs alt currency list set on init
        const {tokenRates, tokenLastDayRates} = (await dispatch<any>(
          getTokenRates(),
        )) as any;

        const allRates = {...rates, ...tokenRates};
        const allLastDayRates = {...lastDayRates, ...tokenLastDayRates};

        dispatch(
          successGetRates({
            rates: allRates,
            lastDayRates: allLastDayRates,
          }),
        );
        logManager.info('startGetRates: success');
        resolve(allRates);
      } catch (err) {
        const errorStr = getErrorString(err);
        dispatch(failedGetRates());
        logManager.error(`startGetRates: failed ${errorStr}`);
        resolve(getState().RATE.rates); // Return cached rates
      }
    });
  };

export const refreshRatesForPortfolioPnl =
  ({
    context,
  }: {
    context?: UpdateAllKeyAndWalletStatusContext;
  } = {}): Effect<Promise<void>> =>
  async dispatch => {
    await dispatch(
      startGetRates({
        context,
        force: true,
      }) as any,
    );
  };

export const getContractAddresses =
  (chain: string): Effect<Array<string>> =>
  (dispatch, getState) => {
    logManager.info(`getContractAddresses ${chain}: starting...`);
    const {
      WALLET: {keys},
    } = getState();
    let allTokenAddresses: string[] = [];

    (Object.values(keys) as Key[]).forEach((key: Key) => {
      key.wallets.forEach((wallet: Wallet) => {
        if (
          chain === wallet.chain &&
          !IsERCToken(wallet.currencyAbbreviation, wallet.chain) &&
          wallet.tokens
        ) {
          // workaround to get linked wallets
          const tokenAddresses = wallet.tokens.map((t: string) =>
            t.replace(`${wallet.id}-`, ''),
          );
          allTokenAddresses.push(...tokenAddresses);
        }
      });
    });
    logManager.info('getContractAddresses: success');
    const uniqueTokenAddresses = [...new Set(allTokenAddresses)];
    return uniqueTokenAddresses;
  };

export const getTokenRates =
  (): Effect<
    Promise<{tokenRates: Rates; tokenLastDayRates: Rates} | undefined>
  > =>
  (dispatch, getState) => {
    return new Promise(async resolve => {
      logManager.info('getTokenRates: starting...');

      let tokenRates: {[key in string]: any} = {};
      let tokenLastDayRates: {[key in string]: any} = {};
      const shouldSkipLogging = true;
      const decimalPrecision = 6;

      try {
        const {
          APP: {altCurrencyList},
          WALLET: {customTokenOptionsByAddress},
        } = getState();
        const {tokenOptionsByAddress} = tokenManager.getTokenOptions();

        const tokensOptsByAddress = {
          ...BitpaySupportedTokenOptsByAddress,
          ...tokenOptionsByAddress,
          ...customTokenOptionsByAddress,
        };

        logManager.info('getTokenRates: selecting alternative currencies');
        const altCurrencies = altCurrencyList.map(
          (altCurrency: AltCurrenciesRowProps) =>
            altCurrency.isoCode.toLowerCase(),
        );
        const chunkArray = (array: string[], size: number) => {
          const chunked_arr = [];
          for (let i = 0; i < array.length; i += size) {
            chunked_arr.push(array.slice(i, i + size));
          }
          return chunked_arr;
        };

        for (const chain of SUPPORTED_VM_TOKENS) {
          const contractAddresses = dispatch(getContractAddresses(chain));
          if (contractAddresses?.length > 0) {
            const chunks = chunkArray(contractAddresses, 25);
            for (const chunk of chunks) {
              const data = await dispatch(
                getMultipleTokenPrices({addresses: chunk, chain}),
              );
              data.forEach((tokenInfo: UnifiedTokenPriceObj) => {
                const {
                  usdPrice,
                  tokenAddress,
                  '24hrPercentChange': percentChange,
                } = tokenInfo;
                const lastUpdate = Date.now();

                if (!usdPrice || !tokenAddress || percentChange == null) {
                  return;
                }
                const formattedTokenAddress = addTokenChainSuffix(
                  tokenAddress,
                  chain,
                );
                // only save token rates if exist in tokens list
                if (tokensOptsByAddress[formattedTokenAddress]) {
                  tokenRates[formattedTokenAddress] = [];
                  tokenLastDayRates[formattedTokenAddress] = [];

                  altCurrencies.forEach((altCurrency: string) => {
                    const rate =
                      dispatch(
                        calculateUsdToAltFiat(
                          usdPrice,
                          altCurrency,
                          decimalPrecision,
                          shouldSkipLogging,
                        ),
                      ) || 0;
                    tokenRates[formattedTokenAddress].push({
                      code: altCurrency.toUpperCase(),
                      fetchedOn: lastUpdate,
                      name: tokensOptsByAddress[formattedTokenAddress]?.symbol,
                      rate,
                      ts: lastUpdate,
                    });
                    const sign = Number(percentChange) >= 0 ? 1 : -1;
                    const lastDayRate =
                      rate /
                      (1 + (sign * Math.abs(Number(percentChange))) / 100);
                    const yesterday = moment
                      .unix(lastUpdate)
                      .subtract(1, 'days')
                      .unix();
                    tokenLastDayRates[formattedTokenAddress].push({
                      code: altCurrency.toUpperCase(),
                      fetchedOn: yesterday,
                      name: tokensOptsByAddress[formattedTokenAddress]?.symbol,
                      rate: lastDayRate,
                      ts: yesterday,
                    });
                  });
                }
              });
            }
          } else {
            logManager.info(
              `No tokens wallets for ${chain} found. Skipping getTokenRates...`,
            );
          }
        }

        logManager.info('getTokenRates: success');
        resolve({tokenRates, tokenLastDayRates});
      } catch (e) {
        let errorStr;
        if (e instanceof Error) {
          errorStr = e.message;
        } else {
          errorStr = JSON.stringify(e);
        }
        logManager.error(`getTokenRates: failed (continue anyway) ${errorStr}`);
        resolve({tokenRates, tokenLastDayRates}); // prevent the app from crashing if coingecko fails
      }
    });
  };

export const getHistoricFiatRate = (
  fiatCode: string,
  currencyAbbreviation: string,
  ts: string,
): Promise<HistoricRate> => {
  return new Promise(async (resolve, reject) => {
    try {
      const url = `${BASE_BWS_URL}/v1/fiatrates/${fiatCode}?coin=${currencyAbbreviation}&ts=${ts}`;
      const {data} = await axios.get(url);
      resolve(data);
    } catch (e) {
      reject(e);
    }
  });
};

export const fetchFiatRateSeriesInterval =
  (args: {
    fiatCode: string;
    interval: FiatRateInterval;
    coinForCacheCheck: string;
    force?: boolean;
    allowedCoins?: string[];
    coin?: string;
    chain?: string;
    tokenAddress?: string;
  }): Effect<Promise<boolean>> =>
  async (dispatch, getState) => {
    const {
      fiatCode,
      interval,
      coinForCacheCheck,
      force,
      allowedCoins,
      coin,
      chain,
      tokenAddress,
    } = args;
    const {
      RATE: {fiatRateSeriesCache},
    } = getState();

    const cacheKey = getFiatRateSeriesCacheKey(
      fiatCode,
      coinForCacheCheck,
      interval,
    );
    const cached = fiatRateSeriesCache[cacheKey];
    const normalizedCoinForCacheCheck =
      normalizeFiatRateSeriesCoin(coinForCacheCheck);

    if (
      !force &&
      cached?.points?.length &&
      !isCacheKeyStale(cached.fetchedOn, HISTORIC_RATES_CACHE_DURATION)
    ) {
      return true;
    }

    const hasFreshDefaultBtcSeries = hasValidFiatRateSeriesInCache({
      fiatRateSeriesCache,
      fiatCode,
      coin: 'btc',
      interval,
      requireFresh: true,
    });
    const shouldSkipDefaultFetchForCoinSpecificRequest =
      !coin &&
      !!normalizedCoinForCacheCheck &&
      normalizedCoinForCacheCheck !== 'btc' &&
      hasFreshDefaultBtcSeries;
    if (shouldSkipDefaultFetchForCoinSpecificRequest) {
      return await dispatch(
        fetchFiatRateSeriesInterval({
          fiatCode,
          interval,
          coinForCacheCheck: normalizedCoinForCacheCheck,
          force,
          allowedCoins,
          coin: normalizedCoinForCacheCheck,
          chain,
          tokenAddress,
        }),
      );
    }

    const normalizedRequestedCoin = normalizeFiatRateSeriesCoin(coin);
    const inFlightKey = getFiatRateSeriesInFlightKey({
      fiatCode,
      interval,
      coin: normalizedRequestedCoin || undefined,
    });
    const allowedCoinsSet = getAllowedCoinsSet(allowedCoins);

    let updates: FiatRateSeriesCache = {};
    let updateCount = 0;
    let requestFailed = false;
    const fetchAndStoreSeries = async (): Promise<void> => {
      const url = getFiatRateSeriesUrl(
        fiatCode,
        interval,
        normalizedRequestedCoin || undefined,
        chain,
        tokenAddress,
      );
      const contextCoin =
        normalizeFiatRateSeriesCoin(
          normalizedRequestedCoin || coinForCacheCheck,
        ) ||
        (
          normalizedRequestedCoin ||
          coinForCacheCheck ||
          'default'
        ).toLowerCase();
      const context = `${(
        fiatCode || ''
      ).toUpperCase()}/${contextCoin}/${interval}`;

      let data: unknown;
      try {
        const response = await axios.get(url);
        data = response.data;
      } catch (error) {
        requestFailed = true;
        if (axios.isAxiosError(error)) {
          const responseData = error.response?.data as
            | {error?: string; message?: string}
            | string
            | undefined;
          const responseError =
            typeof responseData === 'string'
              ? responseData
              : responseData?.error || responseData?.message;
          const responseSuffix = responseError
            ? ` | response=${responseError}`
            : responseData != null
              ? ` | response=${JSON.stringify(responseData)}`
              : '';
          logManager.error(
            `fetchFiatRateSeriesInterval: v4 fiatrates request failed (${context}) ${getErrorString(
              error,
            )}${responseSuffix}`,
          );
        } else {
          logManager.error(
            `fetchFiatRateSeriesInterval: unexpected error (${context}) ${getErrorString(
              error,
            )}`,
          );
        }
        return;
      }

      const fetchedOn = Date.now();
      const responseByCoin = coerceV4FiatRatesPayloadToByCoin(
        data,
        normalizedRequestedCoin || undefined,
      );

      if (!Object.keys(responseByCoin).length) {
        if (coin) {
          logManager.error(
            `fetchFiatRateSeriesInterval: coin-specific v4 fiatrates response had invalid shape (${(
              fiatCode || ''
            ).toUpperCase()}/${normalizedRequestedCoin || coin}/${interval})`,
          );
        }
        requestFailed = true;
        return;
      }

      if (allowedCoinsSet) {
        const keepCoins = Object.keys(responseByCoin)
          .map(seriesCoin => normalizeFiatRateSeriesCoin(seriesCoin))
          .filter(
            seriesCoin => !!seriesCoin && allowedCoinsSet.has(seriesCoin),
          );
        dispatch(
          pruneFiatRateSeriesCache({
            fiatCode,
            keepCoins,
          }),
        );
      }

      updates = {};
      Object.keys(responseByCoin).forEach(seriesCoin => {
        const normalizedSeriesCoin = normalizeFiatRateSeriesCoin(seriesCoin);
        if (allowedCoinsSet && !allowedCoinsSet.has(normalizedSeriesCoin)) {
          return;
        }

        const deduped = sanitizeSortDedupePoints(responseByCoin[seriesCoin]);
        if (!deduped.length) {
          return;
        }
        updates[getFiatRateSeriesCacheKey(fiatCode, seriesCoin, interval)] = {
          fetchedOn,
          points: deduped,
        };
      });

      updateCount = Object.keys(updates).length;
      if (updateCount) {
        dispatch(upsertFiatRateSeriesCache({updates}));
      } else if (coin) {
        const payloadCoins = Object.keys(responseByCoin)
          .map(c => (c || '').toLowerCase())
          .filter(Boolean)
          .join(',');
        logManager.error(
          `fetchFiatRateSeriesInterval: coin-specific v4 fiatrates response returned no valid points (${(
            fiatCode || ''
          ).toUpperCase()}/${
            normalizedRequestedCoin || coin
          }/${interval}) payloadCoins=[${payloadCoins}]`,
        );
      }
    };

    const inFlightRequest =
      fiatRateSeriesRequestsInFlightByKey.get(inFlightKey);
    if (inFlightRequest) {
      await inFlightRequest;
      const latestCache = getState().RATE?.fiatRateSeriesCache || {};
      const hasFreshTargetCoinSeries = hasValidFiatRateSeriesInCache({
        fiatRateSeriesCache: latestCache,
        fiatCode,
        coin: coinForCacheCheck,
        interval,
        requireFresh: true,
      });
      if (hasFreshTargetCoinSeries) {
        return true;
      }

      // A shared default request may not include every coin; retry coin-param fetch.
      const canAttemptCoinSpecificFallback =
        !coin &&
        !!normalizedCoinForCacheCheck &&
        (!allowedCoinsSet || allowedCoinsSet.has(normalizedCoinForCacheCheck));
      if (!canAttemptCoinSpecificFallback) {
        return false;
      }
      return await dispatch(
        fetchFiatRateSeriesInterval({
          fiatCode,
          interval,
          coinForCacheCheck: normalizedCoinForCacheCheck,
          force,
          allowedCoins,
          coin: normalizedCoinForCacheCheck,
          chain,
          tokenAddress,
        }),
      );
    }

    let resolveInFlightRequest: (() => void) | undefined;
    const ownedInFlightRequest = new Promise<void>(resolve => {
      resolveInFlightRequest = resolve;
    });
    fiatRateSeriesRequestsInFlightByKey.set(inFlightKey, ownedInFlightRequest);

    try {
      await fetchAndStoreSeries();
      if (requestFailed) {
        return false;
      }

      const canAttemptCoinSpecificFallback =
        !coin &&
        !!normalizedCoinForCacheCheck &&
        (!allowedCoinsSet || allowedCoinsSet.has(normalizedCoinForCacheCheck));
      if (!canAttemptCoinSpecificFallback) {
        return updateCount > 0;
      }

      const mergedCache: FiatRateSeriesCache = {
        ...(getState().RATE?.fiatRateSeriesCache || {}),
        ...updates,
      };
      const hasTargetCoinSeries = hasValidFiatRateSeriesInCache({
        fiatRateSeriesCache: mergedCache,
        fiatCode,
        coin: normalizedCoinForCacheCheck,
        interval,
        // Do not let stale cached series block the coin-param refresh fallback.
        requireFresh: true,
      });
      if (hasTargetCoinSeries) {
        return true;
      }

      return await dispatch(
        fetchFiatRateSeriesInterval({
          fiatCode,
          interval,
          coinForCacheCheck: normalizedCoinForCacheCheck,
          force,
          allowedCoins,
          coin: normalizedCoinForCacheCheck,
          chain,
          tokenAddress,
        }),
      );
    } finally {
      resolveInFlightRequest?.();
      fiatRateSeriesRequestsInFlightByKey.delete(inFlightKey);
    }
  };

export const fetchFiatRateSeriesAllIntervals =
  (args: {
    fiatCode: string;
    currencyAbbreviation: string;
    force?: boolean;
    allowedCoins?: string[];
    chain?: string;
    tokenAddress?: string;
  }): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const {
      fiatCode,
      currencyAbbreviation,
      force,
      allowedCoins,
      chain,
      tokenAddress,
    } = args;
    const coinForCacheCheck = normalizeFiatRateSeriesCoin(currencyAbbreviation);
    const intervals: FiatRateInterval[] = [
      ...FIAT_RATE_SERIES_CACHED_INTERVALS.filter(
        interval => interval !== 'ALL',
      ),
      ...FIAT_RATE_SERIES_CACHED_INTERVALS.filter(
        interval => interval === 'ALL',
      ),
    ];

    // Always keep the default no-coin v4 request behavior. We gate by BTC so
    // one fresh default response can satisfy all per-coin callers.
    await Promise.allSettled(
      intervals.map(interval =>
        dispatch(
          fetchFiatRateSeriesInterval({
            fiatCode,
            interval,
            coinForCacheCheck: 'btc',
            force,
            allowedCoins,
          }),
        ),
      ),
    );

    if (!coinForCacheCheck) {
      return;
    }

    const allowedCoinsSet = getAllowedCoinsSet(allowedCoins);
    if (allowedCoinsSet && !allowedCoinsSet.has(coinForCacheCheck)) {
      return;
    }

    const fiatRateSeriesCache = getState().RATE?.fiatRateSeriesCache || {};
    const missingIntervals = intervals.filter(interval => {
      return !hasValidFiatRateSeriesInCache({
        fiatRateSeriesCache,
        fiatCode,
        coin: coinForCacheCheck,
        interval,
        requireFresh: true,
      });
    });

    if (!missingIntervals.length) {
      return;
    }

    await Promise.allSettled(
      missingIntervals.map(interval =>
        dispatch(
          fetchFiatRateSeriesInterval({
            fiatCode,
            interval,
            coinForCacheCheck,
            force,
            allowedCoins,
            coin: coinForCacheCheck,
            chain,
            tokenAddress,
          }),
        ),
      ),
    );
  };

export const refreshFiatRateSeries =
  (args: {
    fiatCode: string;
    currencyAbbreviation: string;
    interval: FiatRateInterval;
    spotRate?: number;
  }): Effect<Promise<boolean>> =>
  async (dispatch, getState) => {
    const {fiatCode, currencyAbbreviation, interval, spotRate} = args;
    const {
      RATE: {fiatRateSeriesCache},
    } = getState();

    if (!spotRate || !Number.isFinite(spotRate)) {
      return false;
    }

    const coin = normalizeFiatRateSeriesCoin(currencyAbbreviation);
    const cacheKey = getFiatRateSeriesCacheKey(fiatCode, coin, interval);
    const cached = fiatRateSeriesCache[cacheKey];
    if (!cached?.points?.length) {
      return false;
    }

    if (interval === 'ALL') {
      return false;
    }

    const now = Date.now();
    const lastTs = cached.points[cached.points.length - 1]?.ts;
    if (!lastTs) {
      return false;
    }

    const cadenceMs = getFiatRateSeriesCadenceMs(cached.points, interval);
    if (now - lastTs < cadenceMs) {
      return false;
    }

    if (cached.points.some((p: FiatRatePoint) => p.ts === now)) {
      return false;
    }

    const newPoint: FiatRatePoint = {ts: now, rate: spotRate};
    let points = [...cached.points, newPoint];

    points = dedupeFiatRatePointsByTs(points);
    const targetLength = cached.points.length;
    if (points.length > targetLength) {
      points = points.slice(points.length - targetLength);
    }

    dispatch(
      upsertFiatRateSeriesCache({
        updates: {
          [cacheKey]: {
            fetchedOn: now,
            points,
          },
        },
      }),
    );
    return true;
  };
