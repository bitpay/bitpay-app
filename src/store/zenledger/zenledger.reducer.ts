import {
  GetAccessTokenStatus,
  ApiLoading,
  ZenledgerActionTypes,
  ZenledgerActionType,
  CreatePortfoliosStatus,
} from './zenledger.types';
import {
  ZenledgerPortfolioProps,
  ZenledgerPortfolioResponseProps,
  ZenledgerTokenProps,
} from '../../api/zenledger/zenledger.types';

export const ZenledgerReduxPersistBlackList: (keyof ZenledgerState)[] = [
  'isApiLoading',
  'getAccessTokenStatus',
  'getAccessTokenError',
  'createPortfoliosStatus',
];

export interface ZenledgerState {
  isApiLoading: ApiLoading;
  getAccessTokenStatus: GetAccessTokenStatus;
  getAccessTokenError: string | null;
  createPortfoliosStatus: CreatePortfoliosStatus | null;
  token: ZenledgerTokenProps | null;
  portfolios: {
    wallets: ZenledgerPortfolioProps[];
    data: ZenledgerPortfolioResponseProps;
  } | null;
}

const initialState: ZenledgerState = {
  isApiLoading: false,
  getAccessTokenStatus: null,
  getAccessTokenError: null,
  createPortfoliosStatus: null,
  token: null,
  portfolios: null,
};

export const zenledgerReducer = (
  state: ZenledgerState = initialState,
  action: ZenledgerActionType,
): ZenledgerState => {
  switch (action.type) {
    // ------- Access Token -------- //

    case ZenledgerActionTypes.ACCESS_TOKEN_PENDING:
      return {
        ...state,
        isApiLoading: true,
      };
    case ZenledgerActionTypes.ACCESS_TOKEN_SUCCESS:
      return {
        ...state,
        isApiLoading: false,
        getAccessTokenStatus: 'success',
        getAccessTokenError: null,
        token: action.payload,
      };
    case ZenledgerActionTypes.ACCESS_TOKEN_FAILED:
      return {
        ...state,
        isApiLoading: false,
        getAccessTokenStatus: 'failed',
        getAccessTokenError: action.payload,
      };

    case ZenledgerActionTypes.CREATE_PORTFOLIO_PENDING:
      return {
        ...state,
        isApiLoading: true,
      };

    case ZenledgerActionTypes.CREATE_PORTFOLIO_SUCCESS:
      return {
        ...state,
        isApiLoading: false,
        createPortfoliosStatus: 'success',
        portfolios: action.payload,
      };

    case ZenledgerActionTypes.CREATE_PORTFOLIO_FAILED:
      return {
        ...state,
        isApiLoading: false,
        createPortfoliosStatus: 'failed',
      };

    default:
      return state;
  }
};
