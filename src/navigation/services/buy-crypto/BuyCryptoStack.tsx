import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../components/styled/Text';
import BuyCryptoRoot from './screens/BuyCryptoRoot';

export type BuyCryptoStackParamList = {
  Root: undefined;
};

export enum BuyCryptoScreens {
  ROOT = 'Root',
}

const BuyCrypto = createStackNavigator<BuyCryptoStackParamList>();

const BuyCryptoStack = () => {
  return (
    <BuyCrypto.Navigator
      initialRouteName={BuyCryptoScreens.ROOT}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <BuyCrypto.Screen
        name={BuyCryptoScreens.ROOT}
        component={BuyCryptoRoot}
        options={{
          headerTitle: () => <HeaderTitle>Buy Crypto</HeaderTitle>,
        }}
      />
    </BuyCrypto.Navigator>
  );
};

export default BuyCryptoStack;
