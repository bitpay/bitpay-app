import AsyncStorage from '@react-native-async-storage/async-storage';
import {Action, applyMiddleware, combineReducers, createStore} from 'redux';
import {composeWithDevTools} from 'redux-devtools-extension';
import {createLogger} from 'redux-logger'; // https://github.com/LogRocket/redux-logger
import {getUniqueId} from 'react-native-device-info';
import {createTransform, persistStore, persistReducer} from 'redux-persist'; // https://github.com/rt2zz/redux-persist
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import {encryptTransform} from 'redux-persist-transform-encrypt'; // https://github.com/maxdeviant/redux-persist-transform-encrypt
import thunkMiddleware, {ThunkAction} from 'redux-thunk'; // https://github.com/reduxjs/redux-thunk
import {Selector} from 'reselect';
import {
  bindWalletClient,
  bindWalletKeys,
  transformCircular,
  transformContacts,
} from './transforms/transforms';

import {
  appReducer,
  appReduxPersistBlackList,
  AppState,
} from './app/app.reducer';
import {AppActionType} from './app/app.types';
import {
  bitPayIdReducer,
  bitPayIdReduxPersistBlackList,
  BitPayIdState,
} from './bitpay-id/bitpay-id.reducer';
import {BitPayIdActionType} from './bitpay-id/bitpay-id.types';
import {
  buyCryptoReducer,
  buyCryptoReduxPersistBlackList,
  BuyCryptoState,
} from './buy-crypto/buy-crypto.reducer';
import {BuyCryptoActionType} from './buy-crypto/buy-crypto.types';
import {
  cardReducer,
  cardReduxPersistBlacklist,
  CardState,
} from './card/card.reducer';
import {CardActionType} from './card/card.types';
import {
  locationReducer,
  locationReduxPersistBlackList,
  LocationState,
} from './location/location.reducer';
import {LocationActionType} from './location/location.types';
import {
  logReducer,
  logReduxPersistBlackList,
  LogState,
} from './log/log.reducer';
import {LogActionType} from './log/log.types';
import {
  shopReducer,
  shopReduxPersistBlackList,
  ShopState,
} from './shop/shop.reducer';
import {ShopActionType} from './shop/shop.types';
import {
  swapCryptoReducer,
  swapCryptoReduxPersistBlackList,
  SwapCryptoState,
} from './swap-crypto/swap-crypto.reducer';
import {SwapCryptoActionType} from './swap-crypto/swap-crypto.types';
import {
  walletReducer,
  walletReduxPersistBlackList,
  WalletState,
} from './wallet/wallet.reducer';
import {WalletActionType} from './wallet/wallet.types';
import {
  contactReducer,
  ContactReduxPersistBlackList,
  ContactState,
} from './contact/contact.reducer';
import {ContactActionType} from './contact/contact.types';
import {CoinbaseActionType} from './coinbase/coinbase.types';
import {
  coinbaseReducer,
  CoinbaseReduxPersistBlackList,
  CoinbaseState,
} from './coinbase/coinbase.reducer';
import {
  rateReducer,
  rateReduxPersistBlackList,
  RateState,
} from './rate/rate.reducer';
import {RateActionType} from './rate/rate.types';
import {LogActions} from './log';
import {walletBackupReducer} from './wallet-backup/wallet-backup.reducer';
import {WalletBackupActionType} from './wallet-backup/wallet-backup.types';
import {
  walletConnectV2Reducer,
  walletConnectV2ReduxPersistBlackList,
  WalletConnectV2State,
} from './wallet-connect-v2/wallet-connect-v2.reducer';
import {WalletConnectV2ActionType} from './wallet-connect-v2/wallet-connect-v2.types';
import {
  walletConnectReducer,
  walletConnectReduxPersistBlackList,
  WalletConnectState,
} from './wallet-connect/wallet-connect.reducer';
import {WalletConnectActionType} from './wallet-connect/wallet-connect.types';

const basePersistConfig = {
  storage: AsyncStorage,
  stateReconciler: autoMergeLevel2,
};

const reducerPersistBlackLists = {
  APP: appReduxPersistBlackList,
  BITPAY_ID: bitPayIdReduxPersistBlackList,
  BUY_CRYPTO: buyCryptoReduxPersistBlackList,
  CARD: cardReduxPersistBlacklist,
  LOCATION: locationReduxPersistBlackList,
  LOG: logReduxPersistBlackList,
  SHOP: shopReduxPersistBlackList,
  SWAP_CRYPTO: swapCryptoReduxPersistBlackList,
  WALLET_BACKUP: walletReduxPersistBlackList,
  WALLET: walletReduxPersistBlackList,
  RATE: rateReduxPersistBlackList,
  CONTACT: ContactReduxPersistBlackList,
  COINBASE: CoinbaseReduxPersistBlackList,
  WALLET_CONNECT: walletConnectReduxPersistBlackList,
  WALLET_CONNECT_V2: walletConnectV2ReduxPersistBlackList,
};

/*
 * Create a rootReducer using combineReducers
 * Set persist config for each and import blacklist to omit values
 * redux-persist will automatically persist and rehydrate store from async storage during app init
 * */

const reducers = {
  APP: persistReducer<AppState, AppActionType>(
    {
      ...basePersistConfig,
      key: 'APP',
      blacklist: appReduxPersistBlackList,
    },
    appReducer,
  ),
  BITPAY_ID: persistReducer<BitPayIdState, BitPayIdActionType>(
    {
      ...basePersistConfig,
      key: 'BITPAY_ID',
      blacklist: bitPayIdReduxPersistBlackList,
    },
    bitPayIdReducer,
  ),
  BUY_CRYPTO: persistReducer<BuyCryptoState, BuyCryptoActionType>(
    {
      ...basePersistConfig,
      key: 'BUY_CRYPTO',
      blacklist: buyCryptoReduxPersistBlackList,
    },
    buyCryptoReducer,
  ),
  CARD: persistReducer<CardState, CardActionType>(
    {
      ...basePersistConfig,
      key: 'CARD',
      blacklist: cardReduxPersistBlacklist,
    },
    cardReducer,
  ),
  LOCATION: persistReducer<LocationState, LocationActionType>(
    {
      ...basePersistConfig,
      key: 'LOCATION',
      blacklist: locationReduxPersistBlackList,
    },
    locationReducer,
  ),
  LOG: persistReducer<LogState, LogActionType>(
    {
      ...basePersistConfig,
      key: 'LOG',
      blacklist: logReduxPersistBlackList,
    },
    logReducer,
  ),
  SHOP: persistReducer<ShopState, ShopActionType>(
    {
      ...basePersistConfig,
      key: 'SHOP',
      blacklist: shopReduxPersistBlackList,
    },
    shopReducer,
  ),
  SWAP_CRYPTO: persistReducer<SwapCryptoState, SwapCryptoActionType>(
    {
      ...basePersistConfig,
      key: 'SWAP_CRYPTO',
      blacklist: swapCryptoReduxPersistBlackList,
    },
    swapCryptoReducer,
  ),
  WALLET: persistReducer<WalletState, WalletActionType>(
    {
      storage: AsyncStorage,
      transforms: [bindWalletClient, bindWalletKeys],
      key: 'WALLET',
      blacklist: walletReduxPersistBlackList,
    },
    walletReducer,
  ),
  WALLET_BACKUP: persistReducer<WalletState, WalletBackupActionType>(
    {
      storage: AsyncStorage,
      key: 'WALLET_BACKUP',
      blacklist: walletReduxPersistBlackList,
    },
    walletBackupReducer,
  ),
  RATE: persistReducer<RateState, RateActionType>(
    {
      ...basePersistConfig,
      key: 'RATE',
      blacklist: rateReduxPersistBlackList,
    },
    rateReducer,
  ),
  CONTACT: persistReducer<ContactState, ContactActionType>(
    {
      ...basePersistConfig,
      key: 'CONTACT',
      transforms: [transformContacts],
      blacklist: ContactReduxPersistBlackList,
    },
    contactReducer,
  ),
  COINBASE: persistReducer<CoinbaseState, CoinbaseActionType>(
    {
      ...basePersistConfig,
      key: 'COINBASE',
      blacklist: CoinbaseReduxPersistBlackList,
    },
    coinbaseReducer,
  ),
  WALLET_CONNECT: persistReducer<WalletConnectState, WalletConnectActionType>(
    {
      storage: AsyncStorage,
      key: 'WALLET_CONNECT',
      transforms: [transformCircular],
      blacklist: walletConnectReduxPersistBlackList,
    },
    walletConnectReducer,
  ),
  WALLET_CONNECT_V2: persistReducer<
    WalletConnectV2State,
    WalletConnectV2ActionType
  >(
    {
      ...basePersistConfig,
      key: 'WALLET_CONNECT_V2',
      blacklist: walletConnectV2ReduxPersistBlackList,
    },
    walletConnectV2Reducer,
  ),
};

const rootReducer = combineReducers(reducers);

const logger = createLogger({
  predicate: (_getState, action) =>
    ![
      'LOG/ADD_LOG',
      'APP/SET_CURRENT_ROUTE',
      'persist/REHYDRATE',
      'persist/PERSIST',
    ].includes(action.type),
  stateTransformer: state => {
    return {
      ...state,
      WALLET: {
        ...state.WALLET,
        tokenOptions: null,
        balanceCacheKey: null,
      },
      SHOP: {
        ...state.SHOP,
        availableCardMap: null,
        integrations: null,
        supportedCardMap: null,
      },
      BITPAY_ID: {
        ...state.BITPAY_ID,
        doshToken: null,
        apiToken: null,
      },
    };
  },
});

const getStore = () => {
  const middlewares = [thunkMiddleware];
  if (__DEV__) {
    // @ts-ignore
    middlewares.push(logger);
  }

  let middlewareEnhancers = applyMiddleware(...middlewares);

  if (__DEV__) {
    middlewareEnhancers = composeWithDevTools({trace: true, traceLimit: 25})(
      middlewareEnhancers,
    );
  }

  const rootPersistConfig = {
    ...basePersistConfig,
    key: 'root',
    transforms: [
      createTransform(
        (inboundState: any, key: keyof typeof reducerPersistBlackLists) => {
          // Clear out nested blacklisted fields before encrypting and persisting
          if (Object.keys(reducerPersistBlackLists).includes(key)) {
            const reducerPersistBlackList = reducerPersistBlackLists[key];
            const fieldOverrides = (reducerPersistBlackList as string[]).reduce(
              (allFields, field) => ({...allFields, ...{[field]: undefined}}),
              {},
            );
            return {...inboundState, ...fieldOverrides};
          }
          return inboundState;
        },
      ),
      encryptTransform({
        secretKey: getUniqueId(),
        onError: err => {
          const errStr =
            err instanceof Error ? err.message : JSON.stringify(err);
          LogActions.persistLog(
            LogActions.error(`Encrypt transform failed - ${errStr}`),
          );
        },
      }),
    ],
  };

  // @ts-ignore
  const persistedReducer = persistReducer(rootPersistConfig, rootReducer);
  const store = createStore(persistedReducer, undefined, middlewareEnhancers);
  const persistor = persistStore(store);

  if (__DEV__) {
    // persistor.purge().then(() => console.log('purged persistence'));
  }

  return {
    store,
    persistor,
  };
};

export type RootState = ReturnType<typeof rootReducer>;

export type AppSelector<T = any> = Selector<RootState, T>;

export type Effect<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export default getStore;

export function configureTestStore(initialState: any) {
  const middlewares = [thunkMiddleware];
  const middlewareEnhancers = composeWithDevTools({
    trace: true,
    traceLimit: 25,
  })(applyMiddleware(...middlewares));
  return createStore(rootReducer, initialState, middlewareEnhancers);
}
