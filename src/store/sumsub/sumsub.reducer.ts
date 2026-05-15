import {Network} from '../../constants';
import {SumSubActionType, SumSubActionTypes} from './sumsub.types';

export type SumSubKycStatus =
  | 'Initial'
  | 'Incomplete'
  | 'Pending'
  | 'Approved'
  | 'TemporarilyDeclined'
  | 'FinallyRejected'
  | null;

export interface SumSubState {
  kycStatus: {
    [key in Network]: SumSubKycStatus;
  };
}

const initialState: SumSubState = {
  kycStatus: {
    [Network.mainnet]: null,
    [Network.testnet]: null,
    [Network.regtest]: null,
  },
};

export const sumSubReduxPersistBlackList: (keyof SumSubState)[] = ['kycStatus'];

export const sumSubReducer = (
  state: SumSubState = initialState,
  action: SumSubActionType,
): SumSubState => {
  switch (action.type) {
    case SumSubActionTypes.SET_KYC_STATUS:
      return {
        ...state,
        kycStatus: {
          ...state.kycStatus,
          [action.payload.network]: action.payload.status,
        },
      };

    case SumSubActionTypes.RESET_KYC_STATUS:
      return {
        ...state,
        kycStatus: {
          ...state.kycStatus,
          [action.payload.network]: null,
        },
      };

    default:
      return state;
  }
};
