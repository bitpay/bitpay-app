import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import ContactsScreen from './screens/Contacts';
import ShopScreen from './screens/Shop';
import StartScreen from './screens/Start';
import WalletScreen from './screens/Wallet';

export type IntroStackParamList = {
  Start: undefined;
  Wallet: undefined;
  Shop: undefined;
  Contacts: undefined;
};

export enum IntroScreens {
  START = 'Start',
  WALLET = 'Wallet',
  SHOP = 'Shop',
  CONTACTS = 'Contacts',
}

const Intro = createStackNavigator<IntroStackParamList>();

const IntroStack = () => {
  return (
    <Intro.Navigator
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
        headerShown: false,
      }}
      initialRouteName="Start">
      <Intro.Screen name={IntroScreens.START} component={StartScreen} />
      <Intro.Screen name={IntroScreens.WALLET} component={WalletScreen} />
      <Intro.Screen name={IntroScreens.SHOP} component={ShopScreen} />
      <Intro.Screen name={IntroScreens.CONTACTS} component={ContactsScreen} />
    </Intro.Navigator>
  );
};

export default IntroStack;
