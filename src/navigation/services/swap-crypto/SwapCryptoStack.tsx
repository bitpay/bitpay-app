import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../components/styled/Text';
import SwapCryptoRoot from './screens/SwapCryptoRoot';

export type SwapCryptoStackParamList = {
  Root?: {
    fromWallet?: any;
  };
};

export enum SwapCryptoScreens {
  ROOT = 'Root',
}

const SwapCrypto = createStackNavigator<SwapCryptoStackParamList>();

const SwapCryptoStack = () => {
  return (
    <SwapCrypto.Navigator
      initialRouteName={SwapCryptoScreens.ROOT}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <SwapCrypto.Screen
        name={SwapCryptoScreens.ROOT}
        component={SwapCryptoRoot}
        options={{
          headerTitle: () => <HeaderTitle>Swap Crypto</HeaderTitle>,
        }}
      />
    </SwapCrypto.Navigator>
  );
};

export default SwapCryptoStack;
