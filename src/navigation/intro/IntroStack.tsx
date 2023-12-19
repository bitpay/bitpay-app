import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../constants/NavigationOptions';
import ShopScreen from './screens/Shop';
import StartScreen from './screens/Start';
import WhatsNew from './screens/WhatsNew';
import CustomizeHome from './screens/CustomizeHome';
import {HeaderBackButton} from '@react-navigation/elements';

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

const Intro = createNativeStackNavigator<IntroStackParamList>();
export const IntroAnimeDelay = 300;

const IntroStack = () => {
  return (
    <Intro.Navigator
      screenOptions={({navigation}) => ({
        ...baseNavigatorOptions,
        headerShown: false,
        headerLeft: () => (
          <HeaderBackButton
            onPress={() => {
              navigation.goBack();
            }}
            {...baseNativeHeaderBackButtonProps}
          />
        ),
      })}
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
