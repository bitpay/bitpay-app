import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {baseNavigatorOptions} from '../../../constants/NavigationOptions';
import ShopHome, {ShopHomeParamList} from './ShopHome';
import {NavigatorScreenParams} from '@react-navigation/native';
import {useTheme} from 'styled-components/native';

export type ShopStackParamList = {
  Home: NavigatorScreenParams<ShopHomeParamList>;
};

export enum ShopScreens {
  HOME = 'Home',
  ARCHIVED_GIFT_CARDS = 'ArchivedGiftCards',
}

const Shop = createNativeStackNavigator<ShopStackParamList>();

const ShopStack = () => {
  const theme = useTheme();
  return (
    <Shop.Navigator
      initialRouteName={ShopScreens.HOME}
      screenOptions={() => ({
        ...baseNavigatorOptions,
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
      })}>
      <Shop.Screen
        name={ShopScreens.HOME}
        component={ShopHome}
        options={{headerShown: false}}
      />
    </Shop.Navigator>
  );
};

export default ShopStack;
