import {getBanxaFiatAmountLimits} from '../../navigation/services/buy-crypto/utils/banxa-utils';
import {getMoonpayFiatAmountLimits} from '../../navigation/services/buy-crypto/utils/moonpay-utils';
import {getRampFiatAmountLimits} from '../../navigation/services/buy-crypto/utils/ramp-utils';
import {getSardineFiatAmountLimits} from '../../navigation/services/buy-crypto/utils/sardine-utils';
import {getSimplexFiatAmountLimits} from '../../navigation/services/buy-crypto/utils/simplex-utils';
import {WalletScreens} from '../../navigation/wallet/WalletGroup';
import {navigationRef} from '../../Root';
import {Effect} from '../index';
import {LogActions} from '../log';
import {BuyCryptoLimits} from './buy-crypto.models';
import {Analytics} from '../analytics/analytics.effects';
import {BuyCryptoExchangeKey} from '../../navigation/services/buy-crypto/utils/buy-crypto-utils';

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
  (
    exchange?: BuyCryptoExchangeKey,
    fiatCurrency?: string,
  ): Effect<BuyCryptoLimits> =>
  (dispatch, getState) => {
    const state = getState();
    const locationData = state.LOCATION.locationData;
    let limits: BuyCryptoLimits = {min: undefined, max: undefined};
    let baseFiatArray: string[];

    dispatch(
      LogActions.info(
        `Getting buyCrypto fiat limits. Exchange: ${exchange} - fiatCurrency: ${fiatCurrency}`,
      ),
    );

    switch (exchange) {
      case 'banxa':
        baseFiatArray = ['USD', 'EUR'];
        limits = getBanxaFiatAmountLimits();
        break;
      case 'moonpay':
        baseFiatArray = ['USD', 'EUR'];
        limits = getMoonpayFiatAmountLimits();
        break;
      case 'ramp':
        baseFiatArray = ['USD', 'EUR'];
        limits = getRampFiatAmountLimits();
        break;
      case 'sardine':
        baseFiatArray = ['USD'];
        limits = getSardineFiatAmountLimits();
        break;
      case 'simplex':
        baseFiatArray = ['USD'];
        limits = getSimplexFiatAmountLimits();
        break;
      default:
        baseFiatArray = ['USD', 'EUR'];
        limits = {
          min: Math.min(
            getBanxaFiatAmountLimits().min,
            getMoonpayFiatAmountLimits().min,
            getRampFiatAmountLimits().min,
            getSardineFiatAmountLimits().min,
            getSimplexFiatAmountLimits().min,
          ),
          max: Math.max(
            getBanxaFiatAmountLimits().max,
            getMoonpayFiatAmountLimits().max,
            getRampFiatAmountLimits().max,
            getSardineFiatAmountLimits().max,
            getSimplexFiatAmountLimits().max,
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

export const goToBuyCrypto = (): Effect<void> => dispatch => {
  dispatch(
    Analytics.track('Clicked Buy Crypto', {
      context: 'Shortcuts',
    }),
  );
  navigationRef.navigate(WalletScreens.AMOUNT, {
    onAmountSelected: async (amount: string, setButtonState: any) => {
      navigationRef.navigate('BuyCryptoRoot', {
        amount: Number(amount),
      });
    },
    context: 'buyCrypto',
  });
};
