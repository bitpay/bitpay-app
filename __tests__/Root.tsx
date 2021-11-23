import React from 'react';
import Root from '../src/Root';
import {cleanup, render} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import getStore from '../src/store';

export const {store, persistor} = getStore();

describe('ROOT', () => {
  afterEach(cleanup);
  it('should create root', () => {
    const {toJSON} = render(
      <Provider store={store}>
        <PersistGate persistor={persistor}>
          // @ts-ignore
          {storeRehydrated => storeRehydrated && <Root />}
        </PersistGate>
      </Provider>,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
