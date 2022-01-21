import './shim';
import {AppRegistry} from 'react-native';
import Root from './src/Root';
import React from 'react';
import './i18n';
import {name as appName} from './app.json';
import getStore from './src/store';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import StorybookUIRoot from './storybook';
import {APP_LOAD_STORY_BOOK} from './src/constants/config';

export const {store, persistor} = getStore();

const ReduxProvider = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {storeRehydrated =>
          storeRehydrated &&
          (__DEV__ && APP_LOAD_STORY_BOOK ? <StorybookUIRoot /> : <Root />)
        }
      </PersistGate>
    </Provider>
  );
};

AppRegistry.registerComponent(appName, () => ReduxProvider);
