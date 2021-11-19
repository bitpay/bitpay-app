import {ExchangeRateObj} from './exchange-rate.models';
import {
  ExchangeRateActionType,
  ExchangeRateActionTypes,
} from './exchange-rate.types';

type ExchangeRatesReduxPersistBlackList = [];
export const exchangeRatesReduxPersistBlackList: ExchangeRatesReduxPersistBlackList =
  [];

export interface ExchangeRateState {
  rates: Array<ExchangeRateObj>;
}

const initialState: ExchangeRateState = {
  rates: [],
};

export const exchangeRateReducer = (
  state: ExchangeRateState = initialState,
  action: ExchangeRateActionType,
): ExchangeRateState => {
  switch (action.type) {
    case ExchangeRateActionTypes.SUCCESS_GET_RATES:
      const {rates} = action.payload;
      return {
        ...state,
        rates: [...state.rates, rates],
      };
    default:
      return state;
  }
};
