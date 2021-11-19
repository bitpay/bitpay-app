import {ExchangeRateObj} from './exchange-rate.models';

export enum ExchangeRateActionTypes {
  SUCCESS_GET_RATES = 'EXCHANGE_RATE/SUCCESS_GET_RATES',
  FAILED_GET_RATES = 'EXCHANGE_RATE/FAILED_GET_RATES',
}

interface successGetRates {
  type: typeof ExchangeRateActionTypes.SUCCESS_GET_RATES;
  payload: {
    rates: ExchangeRateObj;
  };
}

interface failedGetRates {
  type: typeof ExchangeRateActionTypes.FAILED_GET_RATES;
}

export type ExchangeRateActionType = successGetRates | failedGetRates;
