import {BitPayIdActionTypes, BitPayIdActionType} from './bitpay-id.types';
import {User} from './bitpay-id.models';
import { Network } from '../../constants';

export const bitPayIdReduxPersistBlackList = [];

export interface BitPayIdState {
  apiToken: {
    [key in Network]: string | null | undefined
  };
  user: {
    [key in Network]: User | null
  }
}

const initialState: BitPayIdState = {
  apiToken: {
    [Network.mainnet]: null,
    [Network.testnet]: null
  },
  user: {
    [Network.mainnet]: null,
    [Network.testnet]: null
  }
};

export const bitPayIdReducer = (
  state: BitPayIdState = initialState,
  action: BitPayIdActionType,
): BitPayIdState => {
  switch (action.type) {
    case BitPayIdActionTypes.SUCCESS_LOGIN:
      return {
        ...state,
        user: {
          ...state.user,
          [action.payload.network]: action.payload.user
        }
      };

    default:
      return state;
  }
};
