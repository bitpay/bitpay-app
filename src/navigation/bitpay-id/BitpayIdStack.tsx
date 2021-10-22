import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import LoginSignup from './screens/LoginSignup';
import {TransitionPresets} from '@react-navigation/stack';
import {screenOptions} from '../../constants/navigation-options';

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
      screenOptions={screenOptions}
      initialRouteName={BitpayIdScreens.LOGIN_SIGNUP}>
      <BitpayId.Screen
        name={BitpayIdScreens.LOGIN_SIGNUP}
        component={LoginSignup}
        options={{
          ...TransitionPresets.SlideFromRightIOS,
        }}
      />
    </BitpayId.Navigator>
  );
};

export default BitpayIdStack;
