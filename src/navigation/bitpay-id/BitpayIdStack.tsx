import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import LoginSignup from './screens/LoginSignup';
import Pair from './screens/Pair';

export type BitpayIdStackParamList = {
  LoginSignup: {context: 'login' | 'signup'};
  Pair: {
    secret?: string,
    dashboardRedirect?: boolean,
    vcd?: string
  };
};

export enum BitpayIdScreens {
  LOGIN_SIGNUP = 'LoginSignup',
  PAIR = 'Pair',
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
        options={{
          ...baseScreenOptions
        }}
      />
      <BitpayId.Screen
        name={BitpayIdScreens.PAIR}
        component={Pair}
        options={{
          ...baseScreenOptions
        }} />
    </BitpayId.Navigator>
  );
};

export default BitpayIdStack;
