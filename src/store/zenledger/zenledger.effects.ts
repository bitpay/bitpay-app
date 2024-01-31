import {Effect} from '..';
import {LogActions} from '../log';
import {
  accessTokenPending,
  accessTokenSuccess,
  accessTokenFailed,
} from '../../store/zenledger';
import ZenledgerAPI from '../../api/zenledger';
import {ZENLEDGER_CREDENTIALS} from '../../api/zenledger/zenledger.constants';
import {
  ZenledgerPortfolioProps,
  ZenledgerPortfolioResponseProps,
  ZenledgerTokenProps,
} from '../../api/zenledger/zenledger.types';
import {
  createPortfoliosFailed,
  createPortfoliosPending,
  createPortfoliosSuccess,
} from '../../store/zenledger/zenledger.actions';

const checkCredentials = () => {
  return (
    ZENLEDGER_CREDENTIALS &&
    ZENLEDGER_CREDENTIALS.client_id &&
    ZENLEDGER_CREDENTIALS.client_secret
  );
};

const tokenExpired = (token: ZenledgerTokenProps): boolean => {
  const tokenCreatedDate = new Date(token?.created_at).getTime() * 1000;
  const expiresIn = token?.expires_in * 1000;
  const nowDate = new Date().getTime();
  return nowDate - tokenCreatedDate > expiresIn;
};

export const zenledgerInitialize =
  (): Effect<Promise<any>> => async dispatch => {
    dispatch(LogActions.info('zenledgerInitialize: starting...'));
    if (!checkCredentials()) {
      dispatch(LogActions.error('zenledgerInitialize: credentials not found'));
      return;
    }
    dispatch(LogActions.info('zenledgerInitialize: success'));
  };

export const getZenLedgerToken = (): Effect<Promise<any>> => async dispatch => {
  try {
    dispatch(LogActions.info('zenledgerToken: creating new token...'));
    dispatch(accessTokenPending());
    const newToken = await ZenledgerAPI.getAccessToken();
    dispatch(accessTokenSuccess(newToken));
    dispatch(LogActions.info('zenledgerToken: token created successfully'));
  } catch (e: any) {
    dispatch(accessTokenFailed(e));
    dispatch(LogActions.error('zenledgerToken Error: ', e));
    throw e;
  }
};

export const zenledgerCreatePortfolio =
  (
    portfolios: ZenledgerPortfolioProps[],
  ): Effect<Promise<ZenledgerPortfolioResponseProps>> =>
  async (dispatch, getState) => {
    const {ZENLEDGER} = getState();
    dispatch(
      LogActions.info('zenledgerCreatePortfolio: creating portfolios...'),
    );
    if (!ZENLEDGER.token) {
      dispatch(LogActions.info('zenledgerCreatePortolio: token not found'));
      await dispatch(getZenLedgerToken());
      return dispatch(zenledgerCreatePortfolio(portfolios));
    }
    if (tokenExpired(ZENLEDGER.token)) {
      dispatch(LogActions.info('zenledgerCreatePortolio: token expired'));
      await dispatch(getZenLedgerToken());
      return dispatch(zenledgerCreatePortfolio(portfolios));
    }
    try {
      dispatch(createPortfoliosPending());
      const resp = await ZenledgerAPI.createPortfolios(
        ZENLEDGER.token,
        portfolios,
      );
      dispatch(createPortfoliosSuccess({wallets: portfolios, data: resp}));
      dispatch(LogActions.info('zenledgerCreatePortfolio: success'));
      return resp;
    } catch (e: any) {
      dispatch(createPortfoliosFailed(e));
      dispatch(LogActions.error('zenledgerCreatePortfolio Error: ', e));
      return e;
    }
  };
