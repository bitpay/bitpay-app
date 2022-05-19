import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../constants/NavigationOptions';
import ShopHome from './ShopHome';
import {HeaderTitle} from '../../../components/styled/Text';
import {t} from 'i18next';

export type ShopStackParamList = {
  Home: undefined;
};

export enum ShopScreens {
  HOME = 'Home',
}

const Shop = createStackNavigator<ShopStackParamList>();

const ShopStack = () => {
  return (
    <Shop.Navigator
      initialRouteName={ShopScreens.HOME}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <Shop.Screen
        name={ShopScreens.HOME}
        component={ShopHome}
        options={{
          headerTitle: () => <HeaderTitle>{t('Shop with crypto')}</HeaderTitle>,
        }}
      />
    </Shop.Navigator>
  );
};

export default ShopStack;
