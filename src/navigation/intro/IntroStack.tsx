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
import WhatsNew from './screens/WhatsNew';
import CustomizeHome from './screens/CustomizeHome';

export type IntroStackParamList = {
  Start: undefined;
  Wallet: undefined;
  Shop: undefined;
  Contacts: undefined;
  WhatsNew: undefined;
  CustomizeHome: undefined;
};

export enum IntroScreens {
  START = 'Start',
  WALLET = 'Wallet',
  SHOP = 'Shop',
  CONTACTS = 'Contacts',
  WHATS_NEW = 'WhatsNew',
  CUSTOMIZE_HOME = 'CustomizeHome',
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
      <Intro.Screen name={IntroScreens.WHATS_NEW} component={WhatsNew} />
      <Intro.Screen
        name={IntroScreens.CUSTOMIZE_HOME}
        component={CustomizeHome}
      />
      <Intro.Screen name={IntroScreens.WALLET} component={WalletScreen} />
      <Intro.Screen name={IntroScreens.SHOP} component={ShopScreen} />
      <Intro.Screen name={IntroScreens.CONTACTS} component={ContactsScreen} />
    </Intro.Navigator>
  );
};

export default IntroStack;
