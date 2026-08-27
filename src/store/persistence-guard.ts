import {AnyAction, Middleware} from 'redux';
import {PAUSE, REHYDRATE} from 'redux-persist';

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export const createRehydrationFailureMiddleware =
  (onFailure: (error: Error) => void): Middleware =>
  store =>
  next =>
  (action: AnyAction) => {
    if (
      action.type === REHYDRATE &&
      action.key === 'root' &&
      action.err != null
    ) {
      const error = toError(action.err);
      store.dispatch({type: PAUSE});
      onFailure(error);
    }
    return next(action);
  };
