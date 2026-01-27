import {Effect} from '../../../index';
import axios from 'axios';
import {BASE_BWS_URL} from '../../../../constants/config';
import {SUPPORTED_VM_TOKENS} from '../../../../constants/currencies';
import {
  FiatRatePoint,
  FiatRateSeriesCache,
  FiatRateInterval,
  HistoricRate,
  Rate,
  Rates,
  getFiatRateSeriesCacheKey,
} from '../../../rate/rate.models';
import {isCacheKeyStale} from '../../utils/wallet';
import {
  HISTORIC_RATES_CACHE_DURATION,
  RATES_CACHE_DURATION,
} from '../../../../constants/wallet';
import {DEFAULT_DATE_RANGE} from '../../../../constants/rate';
import {
  failedGetRates,
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
  getCurrencyAbbreviation,
  addTokenChainSuffix,
} from '../../../../utils/helper-methods';
import {
  getMultipleTokenPrices,
  UnifiedTokenPriceObj,
} from '../../../../store/moralis/moralis.effects';
import {calculateUsdToAltFiat} from '../../../../store/buy-crypto/buy-crypto.effects';
import {IsERCToken, IsSVMChain} from '../../utils/currency';
import {UpdateAllKeyAndWalletStatusContext} from '../status/status';
import {tokenManager} from '../../../../managers/TokenManager';
import {logManager} from '../../../../managers/LogManager';
import type {Key, Wallet} from '../../wallet.models';

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
): string => {
  const days = FIAT_RATE_SERIES_INTERVAL_DAYS[interval];
  const codeUpper = (fiatCode || 'USD').toUpperCase();
  if (!days) {
    return `${FIAT_RATE_SERIES_BASE_URL}/${codeUpper}`;
  }
  return `${FIAT_RATE_SERIES_BASE_URL}/${codeUpper}?days=${days}`;
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
        const yesterday =
          moment().subtract(1, 'days').startOf('hour').unix() * 1000;

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
        let errorStr;
        if (err instanceof Error) {
          errorStr = err.message;
        } else {
          errorStr = JSON.stringify(err);
        }
        dispatch(failedGetRates());
        logManager.error(`startGetRates: failed ${errorStr}`);
        resolve(getState().RATE.rates); // Return cached rates
      }
    });
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

const normalizeFiatRateSeriesCoin = (currencyAbbreviation?: string): string => {
  switch (currencyAbbreviation?.toLowerCase()) {
    case 'wbtc':
      return 'btc';
    case 'weth':
      return 'eth';
    case 'matic':
    case 'pol':
      return 'pol';
    default:
      return (currencyAbbreviation || '').toLowerCase();
  }
};

export const fetchFiatRateSeriesInterval =
  (args: {
    fiatCode: string;
    interval: FiatRateInterval;
    coinForCacheCheck: string;
    force?: boolean;
  }): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const {fiatCode, interval, coinForCacheCheck, force} = args;
    const {
      RATE: {fiatRateSeriesCache},
    } = getState();

    const cacheKey = getFiatRateSeriesCacheKey(
      fiatCode,
      coinForCacheCheck,
      interval,
    );
    const cached = fiatRateSeriesCache[cacheKey];

    if (
      !force &&
      cached?.points?.length &&
      !isCacheKeyStale(cached.fetchedOn, HISTORIC_RATES_CACHE_DURATION)
    ) {
      return;
    }

    const url = getFiatRateSeriesUrl(fiatCode, interval);
    const {data} = await axios.get(url);
    const fetchedOn = Date.now();

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return;
    }

    const updates: FiatRateSeriesCache = {};
    Object.keys(data as Record<string, unknown>).forEach(coin => {
      const rawPoints = (data as Record<string, FiatRatePoint[]>)[coin];
      if (!rawPoints?.length) {
        return;
      }

      const filtered = rawPoints.filter(
        p => Number.isFinite(p?.ts) && Number.isFinite(p?.rate),
      );

      if (!filtered.length) {
        return;
      }

      const points = filtered
        .map(p => ({ts: p.ts, rate: p.rate}))
        .sort((a, b) => a.ts - b.ts);
      const deduped = dedupeFiatRatePointsByTs(points);
      updates[getFiatRateSeriesCacheKey(fiatCode, coin, interval)] = {
        fetchedOn,
        points: deduped,
      };
    });

    if (Object.keys(updates).length) {
      dispatch(upsertFiatRateSeriesCache({updates}));
    }
  };

export const fetchFiatRateSeriesAllIntervals =
  (args: {
    fiatCode: string;
    currencyAbbreviation: string;
    force?: boolean;
  }): Effect<Promise<void>> =>
  async dispatch => {
    const {fiatCode, currencyAbbreviation, force} = args;
    const coinForCacheCheck = normalizeFiatRateSeriesCoin(currencyAbbreviation);
    const intervals: FiatRateInterval[] = ['1D', '1W', '1M', 'ALL'];
    await Promise.allSettled(
      intervals.map(interval =>
        dispatch(
          fetchFiatRateSeriesInterval({
            fiatCode,
            interval,
            coinForCacheCheck,
            force,
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
