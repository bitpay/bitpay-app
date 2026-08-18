import {Effect} from '../../../index';
import axios from 'axios';
import {BASE_BWS_URL} from '../../../../constants/config';
import {SUPPORTED_VM_TOKENS} from '../../../../constants/currencies';
import {HistoricRate, Rate, Rates} from '../../../rate/rate.models';
import {isCacheKeyStale} from '../../utils/wallet';
import {RATES_CACHE_DURATION} from '../../../../constants/wallet';
import {DEFAULT_DATE_RANGE} from '../../../../constants/rate';
import {
  failedGetRates,
  successGetRates,
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

        // Today's and yesterday's tables are independent; fetching them serially
        // doubled rate-refresh latency at launch and on every pull-to-refresh.
        logManager.info(
          `startGetRates: get requests to: ${BASE_BWS_URL}/v3/fiatrates/ (today + ts=${yesterday})`,
        );
        const [{data: rates}, {data: lastDayRates}] = await Promise.all([
          axios.get(`${BASE_BWS_URL}/v3/fiatrates/`),
          axios.get(`${BASE_BWS_URL}/v3/fiatrates?ts=${yesterday}`),
        ]);
        logManager.info(
          'startGetRates: success get requests (today + yesterday)',
        );

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

        // A failed token-price chunk yields no entries for those tokens, and
        // SUCCESS_GET_RATES replaces rather than merges
        // (`{...initialState.rates, ...rates}`), so anything missing here loses
        // its last-known rate app-wide — and ratesCacheKey is bumped regardless,
        // so nothing retries for the cache window. There is no good reason to
        // discard a known-good rate because one HTTP call failed, so carry
        // forward whatever this cycle did not produce.
        const previousRates = getState().RATE.rates;
        const previousLastDayRates = getState().RATE.lastDayRates;
        const allRates: Rates = {...rates, ...tokenRates};
        const allLastDayRates: Rates = {
          ...lastDayRates,
          ...tokenLastDayRates,
        };
        Object.keys(previousRates).forEach(key => {
          if (!allRates[key]) {
            allRates[key] = previousRates[key];
          }
        });
        Object.keys(previousLastDayRates).forEach(key => {
          if (!allLastDayRates[key]) {
            allLastDayRates[key] = previousLastDayRates[key];
          }
        });

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

        // Previously: for chain -> for chunk -> await, so every price chunk on
        // every chain was its own serial round trip. This runs on each 5-minute
        // cache expiry AND on every forced refresh (Home pull-to-refresh always
        // forces). Collect the tasks, fetch them with bounded concurrency, then
        // process results in order so accumulator precedence is unchanged.
        const priceTasks: {chain: string; chunk: string[]}[] = [];
        for (const chain of SUPPORTED_VM_TOKENS) {
          const contractAddresses = dispatch(getContractAddresses(chain));
          if (contractAddresses?.length > 0) {
            for (const chunk of chunkArray(contractAddresses, 25)) {
              priceTasks.push({chain, chunk});
            }
          } else {
            logManager.info(
              `No tokens wallets for ${chain} found. Skipping getTokenRates...`,
            );
          }
        }

        const TOKEN_PRICE_FETCH_CONCURRENCY = 5;
        const priceResults: {chain: string; data: UnifiedTokenPriceObj[]}[] =
          [];
        for (
          let i = 0;
          i < priceTasks.length;
          i += TOKEN_PRICE_FETCH_CONCURRENCY
        ) {
          const batch = priceTasks.slice(i, i + TOKEN_PRICE_FETCH_CONCURRENCY);
          const settled = await Promise.all(
            // Catch per chunk. getMultipleTokenPrices rethrows, and because
            // results are now processed after all batches complete, an
            // uncaught rejection here would skip the processing loop entirely
            // and hand the outer catch EMPTY accumulators — and
            // SUCCESS_GET_RATES replaces rather than merges
            // (`{...initialState.rates, ...rates}`), so one transient Moralis
            // error would wipe every known token rate app-wide. Isolating the
            // chunk is also strictly better than the original serial code,
            // which abandoned all remaining chunks on the first failure.
            batch.map(async ({chain, chunk}) => {
              try {
                return {
                  chain,
                  data: (await dispatch(
                    getMultipleTokenPrices({addresses: chunk, chain}),
                  )) as UnifiedTokenPriceObj[],
                };
              } catch (err) {
                // String(err), not JSON.stringify: a circular non-Error
                // throwable would make the stringify throw and reject the
                // batch, defeating the isolation this catch exists for.
                const errStr = err instanceof Error ? err.message : String(err);
                logManager.error(
                  `getTokenRates: token price chunk failed for ${chain} (continue anyway): ${errStr}`,
                );
                return {chain, data: [] as UnifiedTokenPriceObj[]};
              }
            }),
          );
          priceResults.push(...settled);
        }

        for (const {chain, data} of priceResults) {
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
                  rate / (1 + (sign * Math.abs(Number(percentChange))) / 100);
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
