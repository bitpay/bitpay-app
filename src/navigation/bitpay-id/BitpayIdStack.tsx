import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import Pair from './screens/Pair';
import Profile from './screens/Profile';

export type BitpayIdStackParamList = {
  LoginSignup: {context: 'login' | 'signup'};
  Pair: {
    secret?: string;
    code?: string;
    dashboardRedirect?: boolean;
    vcd?: string;
  };
  Profile: undefined;
};

export enum BitpayIdScreens {
  LOGIN_SIGNUP = 'LoginSignup',
  PAIR = 'Pair',
  PROFILE = 'Profile',
}

const BitpayId = createStackNavigator<BitpayIdStackParamList>();

const BitpayIdStack = () => {
  return (
    <BitpayId.Navigator
      screenOptions={{...baseNavigatorOptions}}
      initialRouteName={BitpayIdScreens.LOGIN_SIGNUP}>
      <BitpayId.Screen
        name={BitpayIdScreens.PAIR}
        component={Pair}
        options={{
          ...baseScreenOptions,
        }}
      />
      <BitpayId.Screen
        name={BitpayIdScreens.PROFILE}
        component={Profile}
        options={{
          ...baseScreenOptions,
        }}
      />
    </BitpayId.Navigator>
  );
};

export default BitpayIdStack;
