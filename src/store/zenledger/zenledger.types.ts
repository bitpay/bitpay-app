import {
  ZenledgerPortfolioProps,
  ZenledgerPortfolioResponseProps,
  ZenledgerTokenProps,
} from '../../api/zenledger/zenledger.types';

export type ApiLoading = boolean;
export type GetAccessTokenStatus = 'success' | 'failed' | null;
export type CreatePortfoliosStatus = 'success' | 'failed' | null;

export enum ZenledgerActionTypes {
  ACCESS_TOKEN_PENDING = 'Zenledger/ACCESS_TOKEN_PENDING',
  ACCESS_TOKEN_SUCCESS = 'Zenledger/ACCESS_TOKEN_SUCCESS',
  ACCESS_TOKEN_FAILED = 'Zenledger/ACCESS_TOKEN_FAILED',
  CREATE_PORTFOLIO_PENDING = 'Zenledger/CREATE_PORTFOLIO_PENDING',
  CREATE_PORTFOLIO_SUCCESS = 'Zenledger/CREATE_PORTFOLIO_SUCCESS',
  CREATE_PORTFOLIO_FAILED = 'Zenledger/CREATE_PORTFOLIO_FAILED',
}

// ------- Access Token -------- //

interface AccessTokenPending {
  type: typeof ZenledgerActionTypes.ACCESS_TOKEN_PENDING;
}

interface AccessTokenSuccess {
  type: typeof ZenledgerActionTypes.ACCESS_TOKEN_SUCCESS;
  payload: ZenledgerTokenProps;
}

interface AccessTokenFailed {
  type: typeof ZenledgerActionTypes.ACCESS_TOKEN_FAILED;
  payload: string;
}

// ------- Create Portfolio -------- //

interface CreatePortfoliosPending {
  type: typeof ZenledgerActionTypes.CREATE_PORTFOLIO_PENDING;
}

interface CreatePortfoliosSuccess {
  type: typeof ZenledgerActionTypes.CREATE_PORTFOLIO_SUCCESS;
  payload: {
    wallets: ZenledgerPortfolioProps[];
    data: ZenledgerPortfolioResponseProps;
  };
}

interface CreatePortfoliosFailed {
  type: typeof ZenledgerActionTypes.CREATE_PORTFOLIO_FAILED;
  payload: string;
}

export type ZenledgerActionType =
  | AccessTokenPending
  | AccessTokenSuccess
  | AccessTokenFailed
  | CreatePortfoliosPending
  | CreatePortfoliosSuccess
  | CreatePortfoliosFailed;
