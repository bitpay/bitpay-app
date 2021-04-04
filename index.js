import {AppRegistry} from 'react-native';
import App from './src/App';
import React from 'react';
import {name as appName} from './app.json';
import getStore from './src/store';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';

export const {store, persistor} = getStore();

const ReduxProvider = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {storeRehydrated => storeRehydrated && <App />}
      </PersistGate>
    </Provider>
  );
};

AppRegistry.registerComponent(appName, () => ReduxProvider);
