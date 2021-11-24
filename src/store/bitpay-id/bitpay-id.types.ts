import {Network} from '../../constants';
import {Session, User} from './bitpay-id.models';

export enum BitPayIdActionTypes {
  SUCCESS_FETCH_SESSION = 'BitPayId/SUCCESS_FETCH_SESSION',
  FAILED_FETCH_SESSION = 'BitPayId/FAILED_FETCH_SESSION',
  SUCCESS_LOGIN = 'BitPayId/SUCCESS_LOGIN',
  FAILED_LOGIN = 'BitPayId/FAILED_LOGIN',
  RESET_LOGIN = 'BitPayId/RESET_LOGIN',
}

interface SuccessFetchSession {
  type: typeof BitPayIdActionTypes.SUCCESS_FETCH_SESSION;
  payload: {session: Session};
}

interface FailedFetchSession {
  type: typeof BitPayIdActionTypes.FAILED_FETCH_SESSION;
}

interface SuccessLogin {
  type: typeof BitPayIdActionTypes.SUCCESS_LOGIN;
  payload: {network: Network; user: User; session: Session};
}

interface FailedLogin {
  type: typeof BitPayIdActionTypes.FAILED_LOGIN;
}

interface ResetLogin {
  type: typeof BitPayIdActionTypes.RESET_LOGIN;
}

export type BitPayIdActionType =
  | SuccessFetchSession
  | FailedFetchSession
  | SuccessLogin
  | FailedLogin
  | ResetLogin;
