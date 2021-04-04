import {Action, applyMiddleware, combineReducers, createStore} from 'redux';
import {authReducer} from './auth/auth.reducer';
import thunkMiddleware, {ThunkAction} from 'redux-thunk';
import {composeWithDevTools} from 'redux-devtools-extension';

const rootReducer = combineReducers({
  AUTH: authReducer,
});

const getStore = () => {
  const middlewares = [thunkMiddleware];
  let middlewareEnhancers = applyMiddleware(...middlewares);

  if (__DEV__) {
    middlewareEnhancers = composeWithDevTools(middlewareEnhancers);
  }

  return createStore(rootReducer, undefined, middlewareEnhancers);
};

export type RootState = ReturnType<typeof rootReducer>;

export type Thunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export default getStore;
