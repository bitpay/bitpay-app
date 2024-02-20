import {ZenledgerActionTypes, ZenledgerActionType} from './zenledger.types';
import {
  ZenledgerPortfolioProps,
  ZenledgerPortfolioResponseProps,
  ZenledgerTokenProps,
} from '../../api/zenledger/zenledger.types';

// ------- Access Token -------- //

export const accessTokenPending = (): ZenledgerActionType => ({
  type: ZenledgerActionTypes.ACCESS_TOKEN_PENDING,
});

export const accessTokenSuccess = (
  token: ZenledgerTokenProps,
): ZenledgerActionType => ({
  type: ZenledgerActionTypes.ACCESS_TOKEN_SUCCESS,
  payload: token,
});

export const accessTokenFailed = (error: string): ZenledgerActionType => ({
  type: ZenledgerActionTypes.ACCESS_TOKEN_FAILED,
  payload: error,
});

// ------- Portfolios -------- //

export const createPortfoliosPending = (): ZenledgerActionType => ({
  type: ZenledgerActionTypes.CREATE_PORTFOLIO_PENDING,
});

export const createPortfoliosSuccess = (portfolios: {
  wallets: ZenledgerPortfolioProps[];
  data: ZenledgerPortfolioResponseProps;
}): ZenledgerActionType => ({
  type: ZenledgerActionTypes.CREATE_PORTFOLIO_SUCCESS,
  payload: portfolios,
});

export const createPortfoliosFailed = (error: string): ZenledgerActionType => ({
  type: ZenledgerActionTypes.CREATE_PORTFOLIO_FAILED,
  payload: error,
});
