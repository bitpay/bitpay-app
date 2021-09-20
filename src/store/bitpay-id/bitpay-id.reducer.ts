import {BitPayIdActionTypes, BitPayIdActionType} from './bitpay-id.types';
import {Account} from './bitpay-id.models';

export const bitPayIdReduxPersistBlackList = [];

export interface BitPayIdState {
  account: Account | undefined;
}

const initialState: BitPayIdState = {
  account: undefined,
};

export const bitPayIdReducer = (
  state: BitPayIdState = initialState,
  action: BitPayIdActionType,
): BitPayIdState => {
  switch (action.type) {
    case BitPayIdActionTypes.SUCCESS_LOGIN:
      return {...state, account: action.payload};

    default:
      return state;
  }
};
