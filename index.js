/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './src/App';
import React from 'react';
import {name as appName} from './app.json';
import getStore from './src/store';
import {Provider} from 'react-redux';
export const store = getStore();

const ReduxProvider = () => {
  return (
    <Provider store={store}>
      <App />
    </Provider>
  );
};

AppRegistry.registerComponent(appName, () => ReduxProvider);
