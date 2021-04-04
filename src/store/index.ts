import {Action, applyMiddleware, combineReducers, createStore} from 'redux';
import {appReducer} from './app/app.reducer';
import {authReducer} from './auth/auth.reducer';
import thunkMiddleware, {ThunkAction} from 'redux-thunk'; // https://github.com/reduxjs/redux-thunk
import logger from 'redux-logger'; // https://github.com/LogRocket/redux-logger
import {composeWithDevTools} from 'redux-devtools-extension';
import AsyncStorage from '@react-native-community/async-storage';
import {persistStore, persistReducer} from 'redux-persist'; // https://github.com/rt2zz/redux-persist

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: [],
};

const rootReducer = combineReducers({
  APP: appReducer,
  AUTH: authReducer,
});

const getStore = () => {
  const middlewares = [thunkMiddleware, logger];
  let middlewareEnhancers = applyMiddleware(...middlewares);

  if (__DEV__) {
    middlewareEnhancers = composeWithDevTools(middlewareEnhancers);
  }

  const persistedReducer = persistReducer(persistConfig, rootReducer);
  const store = createStore(persistedReducer, undefined, middlewareEnhancers);
  const persistor = persistStore(store);

  return {
    store,
    persistor,
  };
};

export type RootState = ReturnType<typeof rootReducer>;

export type Thunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export default getStore;
