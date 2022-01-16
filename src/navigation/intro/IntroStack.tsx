import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import StartScreen from './screens/Start';
import BalanceScreen from './screens/Balance';
import WalletScreen from './screens/Wallet';
import ShopScreen from './screens/Shop';
import ContactsScreen from './screens/Contacts';

export type IntroStackParamList = {
  Start: undefined;
  Balance: undefined;
  Wallet: undefined;
  Shop: undefined;
  Contacts: undefined;
};

export enum IntroScreens {
  START = 'Start',
  BALANCE = 'Balance',
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
      <Intro.Screen name={IntroScreens.BALANCE} component={BalanceScreen} />
      <Intro.Screen name={IntroScreens.WALLET} component={WalletScreen} />
      <Intro.Screen name={IntroScreens.SHOP} component={ShopScreen} />
      <Intro.Screen name={IntroScreens.CONTACTS} component={ContactsScreen} />
    </Intro.Navigator>
  );
};

export default IntroStack;
