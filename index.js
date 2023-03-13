import '@ethersproject/shims';
import './shim';
import '@walletconnect/react-native-compat';
import {AppRegistry} from 'react-native';
import 'react-native-get-random-values';
import Root from './src/Root';
import React from 'react';
import './i18n';
import {name as appName} from './app.json';
import getStore from './src/store';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import 'react-native-url-polyfill/auto'; // https://github.com/facebook/react-native/issues/23922#issuecomment-648096619
import {enableFreeze} from 'react-native-screens';
enableFreeze(true);

export const {store, persistor} = getStore();

const ReduxProvider = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {storeRehydrated => (storeRehydrated ? <Root /> : null)}
      </PersistGate>
    </Provider>
  );
};

AppRegistry.registerComponent(appName, () => ReduxProvider);
