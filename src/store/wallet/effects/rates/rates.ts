import {Effect} from '../../../index';
import axios from 'axios';
import {BASE_BWS_URL} from '../../../../constants/config';
import {SUPPORTED_COINS} from '../../../../constants/currencies';
import {
  DateRanges,
  HistoricRate,
  PriceHistory,
  Rate,
  Rates,
} from '../../wallet.models';
import {isCacheKeyStale} from '../../utils/wallet';
import {
  DEFAULT_DATE_RANGE,
  HISTORIC_RATES_CACHE_DURATION,
  RATES_CACHE_DURATION,
} from '../../../../constants/wallet';
import {
  failedGetPriceHistory,
  failedGetRates,
  successGetPriceHistory,
  successGetRates,
  updateCacheKey,
} from '../../wallet.actions';
import {CacheKeys} from '../../wallet.models';
import moment from 'moment';
import {addAltCurrencyList} from '../../../app/app.actions';
import {AltCurrenciesRowProps} from '../../../../components/list/AltCurrenciesRow';
import {LogActions} from '../../../log';

export const getPriceHistory = (): Effect => async dispatch => {
  try {
    //TODO: update exchange currency
    const coinsList = SUPPORTED_COINS.map(coin => `${coin.toUpperCase()}:USD`)
      .toString()
      .split(',')
      .join('","');
    const {
      data: {data},
    } = await axios.get(
      `https://bitpay.com/currencies/prices?currencyPairs=["${coinsList}"]`,
    );
    const formattedData = data.map((d: PriceHistory) => {
      return {
        ...d,
        coin: d.currencyPair.split(':')[0].toLowerCase(),
      };
    });

    dispatch(successGetPriceHistory(formattedData));
  } catch (err) {
    console.error(err);
    dispatch(failedGetPriceHistory());
  }
};

export const startGetRates =
  (init?: boolean): Effect<Promise<Rates>> =>
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      const {
        WALLET: {ratesCacheKey, rates: cachedRates},
      } = getState();

      if (
        !isCacheKeyStale(
          ratesCacheKey[DEFAULT_DATE_RANGE],
          RATES_CACHE_DURATION,
        )
      ) {
        console.log('Rates - using cached rates');
        return resolve(cachedRates[DEFAULT_DATE_RANGE]);
      }

      dispatch(updateCacheKey({cacheKey: CacheKeys.RATES}));

      try {
        console.log('Rates - fetching new rates');
        const yesterday =
          moment().subtract(1, 'days').startOf('hour').unix() * 1000;
        const {data: rates} = await axios.get(`${BASE_BWS_URL}/v3/fiatrates/`);
        const {data: lastDayRates} = await axios.get(
          `${BASE_BWS_URL}/v3/fiatrates?ts=${yesterday}`,
        );
        if (init) {
          // set alternative currency list
          const alternatives: Array<AltCurrenciesRowProps> = [];
          rates.btc.forEach((r: Rate) => {
            if (r.code && r.name) {
              alternatives.push({isoCode: r.code, name: r.name});
            }
          });
          alternatives.sort((a, b) => (a.name < b.name ? -1 : 1));
          dispatch(addAltCurrencyList(alternatives));
        }
        dispatch(successGetRates({rates, lastDayRates}));
        resolve(rates);
      } catch (err) {
        console.error(err);
        dispatch(failedGetRates());
        reject();
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
  ): Effect<Promise<Array<number>>> =>
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      const {
        WALLET: {ratesCacheKey, rates: cachedRates},
      } = getState();

      if (
        !isCacheKeyStale(
          ratesCacheKey[dateRange],
          HISTORIC_RATES_CACHE_DURATION,
        )
      ) {
        dispatch(LogActions.info('[rates]: using cached rates'));
        const cachedRatesByCoin: Array<number> = currencyAbbreviation
          ? cachedRates[dateRange][currencyAbbreviation.toLowerCase()].map(
              (r: Rate) => {
                return r.rate;
              },
            )
          : [];

        return resolve(cachedRatesByCoin);
      }

      dispatch(updateCacheKey({cacheKey: CacheKeys.RATES}));

      try {
        dispatch(
          LogActions.info(
            `[rates]: fetching historical rates for ${fiatIsoCode} period ${dateRange}`,
          ),
        );
        const firstDateTs =
          moment().subtract(dateRange, 'days').startOf('hour').unix() * 1000;

        // This pulls ALL coins in one query
        const url = `${BASE_BWS_URL}/v2/fiatrates/${fiatIsoCode}?ts=${firstDateTs}`;
        const {data: rates} = await axios.get(url);
        dispatch(successGetRates({rates, dateRange}));
        dispatch(
          LogActions.info('[rates]: fetched historical rates successfully'),
        );

        const ratesByCoin: Array<number> = currencyAbbreviation
          ? rates[currencyAbbreviation.toLowerCase()].map((r: Rate) => {
              return r.rate;
            })
          : [];
        resolve(ratesByCoin);
      } catch (e) {
        dispatch(
          LogActions.error(
            '[rates]: an error occurred while fetching historical rates.',
          ),
        );
        reject(e);
      }
    });
  };
