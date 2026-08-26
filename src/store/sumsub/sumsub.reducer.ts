import {Network} from '../../constants';
import {KycStatusResponse} from '../../api/sumsub';
import {
  KycBannerAck,
  SumSubActionType,
  SumSubActionTypes,
} from './sumsub.types';

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
  // Deliberately survives logout: it is keyed by `eid`, so keeping it stops the
  // same account from being congratulated again after a re-login.
  bannerAck: {
    [key in Network]: KycBannerAck | null;
  };
  // Whether `getKycStatus` has answered since the app started. Not persisted:
  // a rehydrated `kyc` can be stale (the status may have moved on server-side
  // while the app was closed), and prompting to start KYC off a stale
  // notStarted is what re-shows the Get Verified modal.
  statusFetched: {
    [key in Network]: boolean;
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
  bannerAck: {
    [Network.mainnet]: null,
    [Network.testnet]: null,
    [Network.regtest]: null,
  },
  statusFetched: {
    [Network.mainnet]: false,
    [Network.testnet]: false,
    [Network.regtest]: false,
  },
};

export const sumSubReduxPersistBlackList: (keyof SumSubState)[] = [
  'statusFetched',
];

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
  if (!state.bannerAck) {
    state = {...state, bannerAck: initialState.bannerAck};
  }
  if (!state.statusFetched) {
    state = {...state, statusFetched: initialState.statusFetched};
  }
  switch (action.type) {
    case SumSubActionTypes.SET_KYC:
      return {
        ...state,
        kyc: {
          ...state.kyc,
          [action.payload.network]: action.payload.kyc,
        },
        statusFetched: {
          ...state.statusFetched,
          [action.payload.network]: true,
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

    case SumSubActionTypes.SET_BANNER_ACK:
      return {
        ...state,
        bannerAck: {
          ...state.bannerAck,
          [action.payload.network]: action.payload.ack,
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
        statusFetched: {
          ...state.statusFetched,
          [action.payload.network]: false,
        },
      };

    default:
      return state;
  }
};
