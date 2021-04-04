import {Action, applyMiddleware, combineReducers, createStore} from 'redux';
import {appReducer} from './app/app.reducer';
import {authReducer} from './auth/auth.reducer';
import thunkMiddleware, {ThunkAction} from 'redux-thunk'; // https://github.com/reduxjs/redux-thunk
import logger from 'redux-logger'; // https://github.com/LogRocket/redux-logger
import {composeWithDevTools} from 'redux-devtools-extension';
import AsyncStorage from '@react-native-community/async-storage';
import {persistStore, persistReducer} from 'redux-persist'; // https://github.com/rt2zz/redux-persist
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';

const basePersistConfig = {
  storage: AsyncStorage,
  stateReconciler: autoMergeLevel2,
};

const rootPersistConfig = {
  ...basePersistConfig,
  key: 'root',
  blacklist: ['APP', 'AUTH'],
};

/*
 * Create a rootReducer using combineReducers
 * Set persist config for each and whitelist/blacklist store values
 * redux-persist will automatically persist and rehydrate store from async storage during app init
 * */

const rootReducer = combineReducers({
  APP: appReducer,
  AUTH: persistReducer(
    {
      ...basePersistConfig,
      key: 'AUTH',
      whitelist: ['account'],
    },
    authReducer,
  ),
});

const getStore = () => {
  const middlewares = [thunkMiddleware, logger];
  let middlewareEnhancers = applyMiddleware(...middlewares);

  if (__DEV__) {
    middlewareEnhancers = composeWithDevTools(middlewareEnhancers);
  }

  // @ts-ignore
  const persistedReducer = persistReducer(rootPersistConfig, rootReducer);
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
