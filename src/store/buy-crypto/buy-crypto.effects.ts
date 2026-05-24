import {getBanxaFiatAmountLimits} from '../../navigation/services/buy-crypto/utils/banxa-utils';
import {getMoonpayFiatAmountLimits} from '../../navigation/services/buy-crypto/utils/moonpay-utils';
import {getRampFiatAmountLimits} from '../../navigation/services/buy-crypto/utils/ramp-utils';
import {getSardineFiatAmountLimits} from '../../navigation/services/buy-crypto/utils/sardine-utils';
import {getSimplexFiatAmountLimits} from '../../navigation/services/buy-crypto/utils/simplex-utils';
import {getTransakFiatAmountLimits} from '../../navigation/services/buy-crypto/utils/transak-utils';
import {navigationRef} from '../../Root';
import {Effect} from '../index';
import {BuyCryptoLimits, MoonpayEmbeddedCredentials} from './buy-crypto.models';
import {Analytics} from '../analytics/analytics.effects';
import {BuyCryptoExchangeKey} from '../../navigation/services/buy-crypto/utils/buy-crypto-utils';
import {logManager} from '../../managers/LogManager';
import {ExternalServicesScreens} from '../../navigation/services/ExternalServicesGroup';
import {MoonpayClientCredentials} from '../../navigation/services/utils/moonpayFrameCrypto';

// ---------------------------------------------------------------------------
// MoonPay Embedded — module-level cache
// ---------------------------------------------------------------------------
// Credentials obtained from the check-connection frame. Reused across
// purchases; refreshed automatically by MoonpayEmbeddedCredentialManager.
let _moonpayEmbeddedCredentials: MoonpayEmbeddedCredentials | undefined;

// Status of the last completed check-connection frame run.
export type MoonpayEmbeddedCheckStatus =
  | 'checking'
  | 'active'
  | 'connectionRequired'
  | 'pending'
  | 'unavailable'
  | 'failed';

let _moonpayEmbeddedStatus: MoonpayEmbeddedCheckStatus | undefined;

// Anonymous credentials returned when the user is not yet connected.
let _moonpayEmbeddedAnonymousCredentials: MoonpayClientCredentials | undefined;

export const getMoonpayEmbeddedCredentials = ():
  | MoonpayEmbeddedCredentials
  | undefined => _moonpayEmbeddedCredentials;

export const setMoonpayEmbeddedCredentials = (
  data: MoonpayEmbeddedCredentials,
): void => {
  _moonpayEmbeddedCredentials = data;
};

export const clearMoonpayEmbeddedCredentials = (): void => {
  _moonpayEmbeddedCredentials = undefined;
};

export const isMoonpayEmbeddedCredentialsValid = (): boolean => {
  if (!_moonpayEmbeddedCredentials) return false;
  if (!_moonpayEmbeddedCredentials.expiresAt) return false; // TODO: review this casae — should we consider credentials without expiry as valid indefinitely, or treat them as invalid/expired?
  // Consider valid if more than 60 seconds remain
  return (
    new Date(_moonpayEmbeddedCredentials.expiresAt).getTime() - Date.now() >
    60_000
  );
};

export const getMoonpayEmbeddedStatus = ():
  | MoonpayEmbeddedCheckStatus
  | undefined => _moonpayEmbeddedStatus;

export const setMoonpayEmbeddedStatus = (
  status: MoonpayEmbeddedCheckStatus | undefined,
): void => {
  _moonpayEmbeddedStatus = status;
};

export const getMoonpayEmbeddedAnonymousCredentials = ():
  | MoonpayClientCredentials
  | undefined => _moonpayEmbeddedAnonymousCredentials;

export const setMoonpayEmbeddedAnonymousCredentials = (
  creds: MoonpayClientCredentials | undefined,
): void => {
  _moonpayEmbeddedAnonymousCredentials = creds;
};

// Whether the full MoonPay embedded feature is enabled for this device/user.
// Set by MoonpayEmbeddedCredentialManager whenever conditions change.
let _moonpayEmbeddedEnabled: boolean = false;

export const getMoonpayEmbeddedEnabled = (): boolean => _moonpayEmbeddedEnabled;

export const setMoonpayEmbeddedEnabled = (enabled: boolean): void => {
  _moonpayEmbeddedEnabled = enabled;
};

// Listener registered by MoonpayEmbeddedCredentialManager to trigger a recheck
// from anywhere in the app (e.g. after an unlink reset completes).
let _moonpayEmbeddedRecheckListener: (() => void) | undefined;

export const registerMoonpayEmbeddedRecheckListener = (
  fn: () => void,
): (() => void) => {
  _moonpayEmbeddedRecheckListener = fn;
  return () => {
    _moonpayEmbeddedRecheckListener = undefined;
  };
};

/** Call this after a reset/unlink to make the manager create a new session. */
export const requestMoonpayEmbeddedRecheck = (): void => {
  _moonpayEmbeddedRecheckListener?.();
};
// ---------------------------------------------------------------------------

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
      logManager.debug(
        `${altFiatAmount} ${altFiatCurrency} => ${equivalentAmount} USD`,
      );
      return equivalentAmount;
    } else {
      logManager.warn(`There are no rates for : ${altFiatCurrency}-USD`);
      return undefined;
    }
  };

export const calculateUsdToAltFiat =
  (
    usdAmount: number,
    altFiatCurrency: string,
    decimalPrecision: number = 2,
    shouldSkipLogging?: boolean,
  ): Effect<number | undefined> =>
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
      const equivalentAmount = +(usdAmount * rateAltUsd).toFixed(
        decimalPrecision,
      );
      if (!shouldSkipLogging) {
        logManager.debug(
          `${usdAmount} USD => ${equivalentAmount} ${altFiatCurrency}`,
        );
      }
      return equivalentAmount;
    } else {
      logManager.warn(`There are no rates for : USD-${altFiatCurrency}`);
      return undefined;
    }
  };

export const calculateAnyFiatToAltFiat =
  (
    fromFiatAmount: number,
    fromFiatCurrency: string,
    toFiatCurrency: string,
  ): Effect<number | undefined> =>
  (dispatch, getState) => {
    const state = getState();
    const allRates = state.RATE.rates;

    if (fromFiatCurrency.toUpperCase() === toFiatCurrency.toUpperCase()) {
      return fromFiatAmount;
    }
    const rateBtcFromFiat = allRates.btc.find(r => {
      return r.code === fromFiatCurrency.toUpperCase();
    });
    const rateBtcToFiat = allRates.btc.find(r => {
      return r.code === toFiatCurrency.toUpperCase();
    });

    if (rateBtcToFiat && rateBtcFromFiat?.rate && rateBtcFromFiat.rate > 0) {
      const newRate = rateBtcToFiat.rate / rateBtcFromFiat.rate;
      const equivalentAmount = +(fromFiatAmount * newRate).toFixed(2);
      logManager.debug(
        `${fromFiatAmount} ${fromFiatCurrency} => ${equivalentAmount} ${toFiatCurrency}`,
      );
      return equivalentAmount;
    } else {
      logManager.warn(
        `There are no rates for : ${rateBtcFromFiat}-${rateBtcToFiat}`,
      );
      return undefined;
    }
  };

export const roundUpNice = (n: number): number => {
  // 50 for hundreds, 500 for thousands, 5000 for tens of thousands, etc.
  // Example 1: roundUpNice(23456.45) = 25000
  // Example 2: roundUpNice(207.75) = 250
  if (n <= 0) return 0;
  const magnitude = Math.pow(10, Math.floor(Math.log10(n)));
  const step = magnitude / 2;
  const rounded = Math.ceil(n / step) * step;
  return rounded;
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

    logManager.info(
      `Getting buyCrypto fiat limits. Exchange: ${exchange} - fiatCurrency: ${fiatCurrency}`,
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
      case 'transak':
        baseFiatArray = ['USD'];
        limits = getTransakFiatAmountLimits();
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
            getTransakFiatAmountLimits().min,
          ),
          max: Math.max(
            getBanxaFiatAmountLimits().max,
            getMoonpayFiatAmountLimits().max,
            getRampFiatAmountLimits().max,
            getSardineFiatAmountLimits().max,
            getSimplexFiatAmountLimits().max,
            getTransakFiatAmountLimits().max,
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
  navigationRef.navigate(ExternalServicesScreens.ROOT_BUY_AND_SELL, {
    context: 'buyCrypto',
  });
};
