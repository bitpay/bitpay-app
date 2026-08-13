import {Network} from '../../constants';
import {KycStatusResponse} from '../../api/sumsub';
import {SumSubActionType, SumSubActionTypes} from './sumsub.types';

// The whole backend `getKycStatus` object, stored verbatim as the single source
// of truth; UI state is derived from it in the selectors, never pre-mapped.
export type KycInfo = KycStatusResponse;

export interface SumSubState {
  kyc: {
    [key in Network]: KycInfo | null;
  };
  // Raw SDK status (PascalCase — a different vocabulary from the backend). Only a
  // fallback while the backend lags on a just-finished session; cleared once it
  // catches up.
  sdkStatus: {
    [key in Network]: string | null;
  };
}

const initialState: SumSubState = {
  kyc: {
    [Network.mainnet]: null,
    [Network.testnet]: null,
    [Network.regtest]: null,
  },
  sdkStatus: {
    [Network.mainnet]: null,
    [Network.testnet]: null,
    [Network.regtest]: null,
  },
};

export const sumSubReduxPersistBlackList: (keyof SumSubState)[] = [];

export const sumSubReducer = (
  state: SumSubState = initialState,
  action: SumSubActionType,
): SumSubState => {
  if (!state.kyc) {
    state = {...state, kyc: initialState.kyc};
  }
  if (!state.sdkStatus) {
    state = {...state, sdkStatus: initialState.sdkStatus};
  }
  switch (action.type) {
    case SumSubActionTypes.SET_KYC:
      return {
        ...state,
        kyc: {
          ...state.kyc,
          [action.payload.network]: action.payload.kyc,
        },
      };

    case SumSubActionTypes.SET_SDK_STATUS:
      return {
        ...state,
        sdkStatus: {
          ...state.sdkStatus,
          [action.payload.network]: action.payload.sdkStatus,
        },
      };

    case SumSubActionTypes.RESET_KYC:
      return {
        ...state,
        kyc: {
          ...state.kyc,
          [action.payload.network]: null,
        },
        sdkStatus: {
          ...state.sdkStatus,
          [action.payload.network]: null,
        },
      };

    default:
      return state;
  }
};
