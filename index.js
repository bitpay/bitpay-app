import 'react-native-get-random-values'; // must import before @ethersproject/shims
import '@ethersproject/shims';
import 'fast-text-encoding';
import './shim';
import '@walletconnect/react-native-compat';
import {AppRegistry, Alert} from 'react-native';
import Root from './src/Root';
import React, {useState, useEffect} from 'react';
import './i18n';
import {
  setJSExceptionHandler,
  setNativeExceptionHandler,
} from 'react-native-exception-handler';
import {name as appName} from './app.json';
import getStore from './src/store';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import 'react-native-url-polyfill/auto'; // https://github.com/facebook/react-native/issues/23922#issuecomment-648096619
import {enableFreeze} from 'react-native-screens';
import {AppInitialization} from './src/AppInitialization';
import {Analytics} from './src/store/analytics/analytics.effects';
import {APP_VERSION} from './src/constants/config';
import {GIT_COMMIT_HASH} from '@env';
import {LogActions} from './src/store/log';
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';

enableFreeze(true);

const makeErrorHandler = store => (e, isFatal) => {
  if (isFatal) {
    store.dispatch(
      Analytics.track('BitPay App - Crashed App', {
        build: GIT_COMMIT_HASH,
        version: APP_VERSION,
      }),
    );
    const errStr = e instanceof Error ? e.message : JSON.stringify(e);
    store.dispatch(LogActions.persistLog(LogActions.error(errStr)));
    Alert.alert(
      'Unexpected error occurred',
      `
        Error: ${errStr}
        `,
      [
        {
          text: 'Close',
        },
      ],
    );
  }
};

const makeNativeExceptionHandler = store => () => {
  store.dispatch(
    Analytics.track('BitPay App - Crashed App', {
      build: GIT_COMMIT_HASH,
      version: APP_VERSION,
    }),
  );
};


configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});


const ReduxProvider = () => {
  const [storeReady, setStoreReady] = useState(false);
  const [{store: reduxStore, persistor: reduxPersistor}, setStore] = useState({
    store: null,
    persistor: null,
  });

  useEffect(() => {
    getStore().then(({store, persistor}) => {
      setStore({store, persistor});
      setStoreReady(true);
      setJSExceptionHandler(makeErrorHandler(store), true);
      setNativeExceptionHandler(makeNativeExceptionHandler(store));
    });
  }, []);

  return (
    <>
      {storeReady ? (
        <Provider store={reduxStore}>
          <PersistGate loading={null} persistor={reduxPersistor}>
            {storeRehydrated =>
              storeRehydrated ? (
                <AppInitialization>
                  <Root />
                </AppInitialization>
              ) : null
            }
          </PersistGate>
        </Provider>
      ) : null}
    </>
  );
};

AppRegistry.registerComponent(appName, () => ReduxProvider);
