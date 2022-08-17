import {Effect} from '../index';
import {LogActions} from '../log';

export const calculateAltFiatToUsd =
  (
    altFiatAmount: number,
    altFiatCurrency: string,
  ): Effect<number | undefined> =>
  (dispatch, getState) => {
    const state = getState();
    const allRates = state.WALLET.rates;

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
    const allRates = state.WALLET.rates;

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
