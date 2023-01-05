import {getMoonpayFiatAmountLimits} from '../../navigation/services/buy-crypto/utils/moonpay-utils';
import {getSimplexFiatAmountLimits} from '../../navigation/services/buy-crypto/utils/simplex-utils';
import {getWyreFiatAmountLimits} from '../../navigation/services/buy-crypto/utils/wyre-utils';
import {Effect} from '../index';
import {LogActions} from '../log';
import {BuyCryptoLimits} from './buy-crypto.models';

export const calculateAltFiatToUsd =
  (
    altFiatAmount: number,
    altFiatCurrency: string,
  ): Effect<number | undefined> =>
  (dispatch, getState) => {
    const state = getState();
    const allRates = state.RATE.rates;

    if (altFiatCurrency.toUpperCase() === 'USD') {
      return altFiatAmount;
    }
    const rateBtcUsd = allRates.btc.find(r => {
      return r.code === 'USD';
    });
    const rateBtcAlt = allRates.btc.find(r => {
      return r.code === altFiatCurrency.toUpperCase();
    });

    if (rateBtcUsd && rateBtcAlt?.rate && rateBtcAlt.rate > 0) {
      const rateAltUsd = rateBtcUsd.rate / rateBtcAlt.rate;
      const equivalentAmount = +(altFiatAmount * rateAltUsd).toFixed(2);
      dispatch(
        LogActions.debug(
          `${altFiatAmount} ${altFiatCurrency} => ${equivalentAmount} USD`,
        ),
      );
      return equivalentAmount;
    } else {
      dispatch(
        LogActions.warn(`There are no rates for : ${altFiatCurrency}-USD`),
      );
      return undefined;
    }
  };

export const calculateUsdToAltFiat =
  (usdAmount: number, altFiatCurrency: string): Effect<number | undefined> =>
  (dispatch, getState) => {
    const state = getState();
    const allRates = state.RATE.rates;

    const rateBtcUsd = allRates.btc.find(r => {
      return r.code === 'USD';
    });
    const rateBtcAlt = allRates.btc.find(r => {
      return r.code === altFiatCurrency.toUpperCase();
    });

    if (rateBtcAlt && rateBtcUsd?.rate && rateBtcUsd?.rate > 0) {
      const rateAltUsd = rateBtcAlt.rate / rateBtcUsd.rate;
      const equivalentAmount = +(usdAmount * rateAltUsd).toFixed(2);
      dispatch(
        LogActions.debug(
          `${usdAmount} USD => ${equivalentAmount} ${altFiatCurrency}`,
        ),
      );
      return equivalentAmount;
    } else {
      dispatch(
        LogActions.warn(`There are no rates for : USD-${altFiatCurrency}`),
      );
      return undefined;
    }
  };

export const getBuyCryptoFiatLimits =
  (exchange?: string, fiatCurrency?: string): Effect<BuyCryptoLimits> =>
  (dispatch, getState) => {
    const state = getState();
    const country = state.LOCATION.countryData;
    let limits: BuyCryptoLimits = {min: undefined, max: undefined};
    let baseFiatArray: string[];

    dispatch(
      LogActions.info(
        `Getting buyCrypto fiat limits. Exchange: ${exchange} - fiatCurrency: ${fiatCurrency}`,
      ),
    );

    switch (exchange) {
      case 'moonpay':
        baseFiatArray = ['USD', 'EUR'];
        limits = getMoonpayFiatAmountLimits();
        break;
      case 'simplex':
        baseFiatArray = ['USD'];
        limits = getSimplexFiatAmountLimits();
        break;
      case 'wyre':
        baseFiatArray = ['USD', 'EUR'];
        limits = getWyreFiatAmountLimits(country?.shortCode || 'US');
        break;
      default:
        baseFiatArray = ['USD', 'EUR'];
        limits = {
          min: Math.min(
            getMoonpayFiatAmountLimits().min,
            getSimplexFiatAmountLimits().min,
            getWyreFiatAmountLimits(country?.shortCode || 'US').min,
          ),
          max: Math.max(
            getMoonpayFiatAmountLimits().max,
            getSimplexFiatAmountLimits().max,
            getWyreFiatAmountLimits(country?.shortCode || 'US').max,
          ),
        };
        break;
    }

    if (baseFiatArray.includes(fiatCurrency || 'USD')) {
      return limits;
    } else {
      return {
        min: limits.min
          ? dispatch(calculateUsdToAltFiat(limits.min, fiatCurrency || 'USD'))
          : undefined,
        max: limits.max
          ? dispatch(calculateUsdToAltFiat(limits.max, fiatCurrency || 'USD'))
          : undefined,
      };
    }
  };
