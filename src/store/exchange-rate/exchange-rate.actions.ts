import {
  ExchangeRateActionType,
  ExchangeRateActionTypes,
} from './exchange-rate.types';
import {ExchangeRateObj} from './exchange-rate.models';

export const successGetRates = (payload: {
  rates: ExchangeRateObj;
}): ExchangeRateActionType => ({
  type: ExchangeRateActionTypes.SUCCESS_GET_RATES,
  payload,
});

export const failedGetRates = (): ExchangeRateActionType => ({
  type: ExchangeRateActionTypes.FAILED_GET_RATES,
});
