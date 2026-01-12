import {Effect} from '../../../index';
import axios from 'axios';
import {BASE_BWS_URL} from '../../../../constants/config';
import {SUPPORTED_VM_TOKENS} from '../../../../constants/currencies';
import {DateRanges, HistoricRate, Rate, Rates} from '../../../rate/rate.models';
import {isCacheKeyStale} from '../../utils/wallet';
import {
  HISTORIC_RATES_CACHE_DURATION,
  RATES_CACHE_DURATION,
} from '../../../../constants/wallet';
import {DEFAULT_DATE_RANGE} from '../../../../constants/rate';
import {
  failedGetRates,
  successGetHistoricalRates,
  successGetRates,
  updateCacheKey,
  updateHistoricalCacheKey,
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

    Object.values(keys).forEach(key => {
      key.wallets.forEach(wallet => {
        if (
          chain === wallet.chain &&
          !IsERCToken(wallet.currencyAbbreviation, wallet.chain) &&
          wallet.tokens
        ) {
          // workaround to get linked wallets
          const tokenAddresses = wallet.tokens.map(t =>
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
        const altCurrencies = altCurrencyList.map(altCurrency =>
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

                  altCurrencies.forEach(altCurrency => {
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

export const fetchHistoricalRates =
  (
    dateRange: DateRanges = DateRanges.Day,
    currencyAbbreviation?: string,
    fiatIsoCode: string = 'USD',
  ): Effect<Promise<Array<Rate>>> =>
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      const {
        RATE: {
          ratesHistoricalCacheKey,
          ratesByDateRange: cachedRates,
          cachedValuesFiatCode,
        },
      } = getState();

      switch (currencyAbbreviation?.toLowerCase()) {
        case 'wbtc':
          currencyAbbreviation = 'btc';
          break;
        case 'weth':
          currencyAbbreviation = 'eth';
          break;
        case 'pol':
          currencyAbbreviation = 'matic';
          break;
      }

      const cachedRatesByCoin =
        (currencyAbbreviation &&
          cachedRates[dateRange][currencyAbbreviation.toLowerCase()]) ||
        [];

      if (
        !isCacheKeyStale(
          ratesHistoricalCacheKey[dateRange],
          HISTORIC_RATES_CACHE_DURATION,
        ) &&
        cachedRatesByCoin.length > 0 &&
        cachedValuesFiatCode?.toUpperCase() === fiatIsoCode?.toUpperCase()
      ) {
        logManager.info(
          `[rates]: using cached rates. currencyAbbreviation: ${currencyAbbreviation} | fiatIsoCode: ${fiatIsoCode}`,
        );
        return resolve(cachedRatesByCoin);
      }

      dispatch(
        updateHistoricalCacheKey({cacheKey: CacheKeys.HISTORICAL_RATES}),
      );

      try {
        logManager.info(
          `[rates]: fetching historical rates for ${fiatIsoCode} period ${dateRange}`,
        );
        const firstDateTs =
          moment().subtract(dateRange, 'days').startOf('hour').unix() * 1000;

        // This pulls ALL coins in one query
        const url = `${BASE_BWS_URL}/v2/fiatrates/${fiatIsoCode}?ts=${firstDateTs}`;
        const {data: rates} = await axios.get(url);
        dispatch(
          successGetHistoricalRates({
            ratesByDateRange: rates,
            dateRange,
            fiatCode: fiatIsoCode,
          }),
        );
        logManager.info('[rates]: fetched historical rates successfully');

        const ratesByCoin = currencyAbbreviation
          ? rates[currencyAbbreviation.toLowerCase()]
          : [];
        resolve(ratesByCoin);
      } catch (e) {
        logManager.error(
          '[rates]: an error occurred while fetching historical rates.',
        );
        reject(e);
      }
    });
  };
