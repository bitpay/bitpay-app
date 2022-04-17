import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import ShopScreen from './screens/Shop';
import StartScreen from './screens/Start';
import WhatsNew from './screens/WhatsNew';
import CustomizeHome from './screens/CustomizeHome';

export type IntroStackParamList = {
  Start: undefined;
  Shop: undefined;
  WhatsNew: undefined;
  CustomizeHome: undefined;
};

export enum IntroScreens {
  START = 'Start',
  SHOP = 'Shop',
  WHATS_NEW = 'WhatsNew',
  CUSTOMIZE_HOME = 'CustomizeHome',
}

const Intro = createStackNavigator<IntroStackParamList>();
export const IntroAnimeDelay = 300;

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
      <Intro.Screen name={IntroScreens.SHOP} component={ShopScreen} />
    </Intro.Navigator>
  );
};

export default IntroStack;
