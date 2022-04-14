import {Effect} from '../../../index';
import axios from 'axios';
import {BASE_BWS_URL} from '../../../../constants/config';
import {WalletActions} from '../../index';
import {SUPPORTED_COINS} from '../../../../constants/currencies';
import {HistoricRate, PriceHistory, Rate, Rates} from '../../wallet.models';
import {isCacheKeyStale} from '../../utils/wallet';
import {RATES_CACHE_DURATION} from '../../../../constants/wallet';
import {updateCacheKey} from '../../wallet.actions';
import {CacheKeys} from '../../wallet.models';
import moment from 'moment';
import {addAltCurrencyList} from '../../../app/app.actions';
import {AltCurrenciesRowProps} from '../../../../components/list/AltCurrenciesRow';

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

    dispatch(WalletActions.successGetPriceHistory(formattedData));
  } catch (err) {
    console.error(err);
    dispatch(WalletActions.failedGetPriceHistory());
  }
};

export const startGetRates =
  (init?: boolean): Effect<Promise<Rates>> =>
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      const {
        WALLET: {ratesCacheKey, rates: cachedRates},
      } = getState();
      if (!isCacheKeyStale(ratesCacheKey, RATES_CACHE_DURATION)) {
        console.log('Rates - using cached rates');
        return resolve(cachedRates);
      }

      dispatch(updateCacheKey(CacheKeys.RATES));

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
        dispatch(WalletActions.successGetRates({rates, lastDayRates}));
        resolve(rates);
      } catch (err) {
        console.error(err);
        dispatch(WalletActions.failedGetRates());
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
