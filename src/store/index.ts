import {Action, applyMiddleware, combineReducers, createStore} from 'redux';
import {authReducer} from './auth/auth.reducer';
import thunkMiddleware, {ThunkAction} from 'redux-thunk';

const rootReducer = combineReducers({
  AUTH: authReducer,
});

const getStore = () => {
  const middlewares = [thunkMiddleware];
  const middlewareEnhancers = applyMiddleware(...middlewares);
  return createStore(rootReducer, undefined, middlewareEnhancers);
};

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof rootReducer>;
export type Thunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export default getStore;
