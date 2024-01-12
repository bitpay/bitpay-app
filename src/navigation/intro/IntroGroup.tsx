import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import ShopScreen from './screens/Shop';
import StartScreen from './screens/Start';
import WhatsNew from './screens/WhatsNew';
import CustomizeHome from './screens/CustomizeHome';
import {Root} from '../../Root';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../constants/NavigationOptions';
import {HeaderBackButton} from '@react-navigation/elements';

interface IntroProps {
  Intro: typeof Root;
}

export type IntroGroupParamList = {
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

export const IntroAnimeDelay = 300;

const IntroStack: React.FC<IntroProps> = ({Intro}) => {
  return (
    <Intro.Group
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
      })}>
      <Intro.Screen name={IntroScreens.START} component={StartScreen} />
      <Intro.Screen name={IntroScreens.WHATS_NEW} component={WhatsNew} />
      <Intro.Screen
        name={IntroScreens.CUSTOMIZE_HOME}
        component={CustomizeHome}
      />
      <Intro.Screen name={IntroScreens.SHOP} component={ShopScreen} />
    </Intro.Group>
  );
};

export default IntroStack;
