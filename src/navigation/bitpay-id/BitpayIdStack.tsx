import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import LoginSignup from './screens/LoginSignup';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/navigation-options';

export type BitpayIdStackParamList = {
  LoginSignup: {context: 'login' | 'signup'};
};

export enum BitpayIdScreens {
  LOGIN_SIGNUP = 'LoginSignup',
}

const BitpayId = createStackNavigator<BitpayIdStackParamList>();

const BitpayIdStack = () => {
  return (
    <BitpayId.Navigator
      screenOptions={{...baseNavigatorOptions}}
      initialRouteName={BitpayIdScreens.LOGIN_SIGNUP}>
      <BitpayId.Screen
        name={BitpayIdScreens.LOGIN_SIGNUP}
        component={LoginSignup}
        options={{...baseScreenOptions}}
      />
    </BitpayId.Navigator>
  );
};

export default BitpayIdStack;
