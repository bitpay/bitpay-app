import {Action, applyMiddleware, combineReducers, createStore} from 'redux';
import {composeWithDevTools} from 'redux-devtools-extension';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from 'redux-logger'; // https://github.com/LogRocket/redux-logger
import {getUniqueId} from 'react-native-device-info';
import {persistStore, persistReducer} from 'redux-persist'; // https://github.com/rt2zz/redux-persist
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import {encryptTransform} from 'redux-persist-transform-encrypt'; // https://github.com/maxdeviant/redux-persist-transform-encrypt
import thunkMiddleware, {ThunkAction} from 'redux-thunk'; // https://github.com/reduxjs/redux-thunk
import {appReducer, appReduxPersistBlackList} from './app/app.reducer';
import {
  bitPayIdReducer,
  bitPayIdReduxPersistBlackList,
} from './bitpay-id/bitpay-id.reducer';
import {cardReducer, cardReduxPersistBlacklist} from './card/card.reducer';
import {logReducer, logReduxPersistBlackList} from './log/log.reducer';
import {
  walletReducer,
  walletReduxPersistBlackList,
} from './wallet/wallet.reducer';

const basePersistConfig = {
  storage: AsyncStorage,
  stateReconciler: autoMergeLevel2,
};

/*
 * Create a rootReducer using combineReducers
 * Set persist config for each and import blacklist to omit values
 * redux-persist will automatically persist and rehydrate store from async storage during app init
 * */

const reducers = {
  APP: persistReducer(
    {
      ...basePersistConfig,
      key: 'APP',
      blacklist: appReduxPersistBlackList,
    },
    appReducer,
  ),
  BITPAY_ID: persistReducer(
    {
      ...basePersistConfig,
      key: 'BITPAY_ID',
      blacklist: bitPayIdReduxPersistBlackList,
    },
    bitPayIdReducer,
  ),
  CARD: persistReducer(
    {
      ...basePersistConfig,
      key: 'CARD',
      blacklist: cardReduxPersistBlacklist,
    },
    cardReducer,
  ),
  LOG: persistReducer(
    {
      ...basePersistConfig,
      key: 'LOG',
      blacklist: logReduxPersistBlackList,
    },
    logReducer,
  ),
  WALLET: persistReducer(
    {
      ...basePersistConfig,
      key: 'WALLET',
      blacklist: walletReduxPersistBlackList,
    },
    walletReducer,
  ),
};

const rootReducer = combineReducers(reducers);

const getStore = () => {
  const middlewares = [thunkMiddleware, logger];
  let middlewareEnhancers = applyMiddleware(...middlewares);

  if (__DEV__) {
    middlewareEnhancers = composeWithDevTools({trace: true, traceLimit: 25})(
      middlewareEnhancers,
    );
  }

  const rootPersistConfig = {
    ...basePersistConfig,
    key: 'root',
    // override all stores as they will handle their own blacklisting of certain values
    blacklist: Object.keys(reducers),
    transforms: [
      encryptTransform({
        secretKey: getUniqueId(),
        onError: error => {
          console.debug(error);
        },
      }),
    ],
  };

  // @ts-ignore
  const persistedReducer = persistReducer(rootPersistConfig, rootReducer);
  const store = createStore(persistedReducer, undefined, middlewareEnhancers);
  const persistor = persistStore(store);

  // persistor.purge().then(() => console.log('purged persistence'));

  return {
    store,
    persistor,
  };
};

export type RootState = ReturnType<typeof rootReducer>;

export type Effect<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export default getStore;

export function configureTestStore(initialState: any) {
  return createStore(rootReducer, initialState);
}
