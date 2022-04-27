import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {HeaderTitle} from '../../components/styled/Text';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import ActivateScreen, {
  ActivateScreenParamList,
} from './screens/ActivateScreen';
import AuthenticationEmailAuthScreen from './screens/AuthenticationEmailAuthScreen';
import AuthenticationScreen, {
  AuthScreenParamList,
} from './screens/AuthenticationScreen';
import AuthenticationTwoFactorScreen from './screens/AuthenticationTwoFactorScreen';
import CompleteScreen, {
  CompleteScreenParamList,
} from './screens/CompleteScreen';
import RootScreen, {RootScreenParamList} from './screens/RootScreen';

export type CardActivationStackParamList = {
  Root: RootScreenParamList;
  Authentication: AuthScreenParamList;
  TwoFactor: undefined;
  EmailAuth: undefined;
  Activate: ActivateScreenParamList;
  Complete: CompleteScreenParamList;
};

export enum CardActivationScreens {
  ROOT = 'Root',
  AUTHENTICATION = 'Authentication',
  TWO_FACTOR = 'TwoFactor',
  EMAIL_AUTH = 'EmailAuth',
  ACTIVATE = 'Activate',
  COMPLETE = 'Complete',
}

const CardActivation = createStackNavigator<CardActivationStackParamList>();

const CardActivationStack: React.FC = () => {
  return (
    <CardActivation.Navigator
      initialRouteName={CardActivationScreens.ROOT}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <CardActivation.Screen
        name={CardActivationScreens.ROOT}
        component={RootScreen}
      />
      <CardActivation.Screen
        name={CardActivationScreens.AUTHENTICATION}
        component={AuthenticationScreen}
        options={{
          headerTitle: () => <HeaderTitle>Verify your credentials</HeaderTitle>,
        }}
      />
      <CardActivation.Screen
        name={CardActivationScreens.TWO_FACTOR}
        component={AuthenticationTwoFactorScreen}
        options={{
          headerTitle: () => <HeaderTitle>2-Step Verification</HeaderTitle>,
        }}
      />
      <CardActivation.Screen
        name={CardActivationScreens.EMAIL_AUTH}
        component={AuthenticationEmailAuthScreen}
        options={{
          headerTitle: () => <HeaderTitle>Check your email</HeaderTitle>,
        }}
      />
      <CardActivation.Screen
        name={CardActivationScreens.ACTIVATE}
        component={ActivateScreen}
        options={{
          headerTitle: () => <HeaderTitle>Activate BitPay Card</HeaderTitle>,
        }}
      />
      <CardActivation.Screen
        name={CardActivationScreens.COMPLETE}
        component={CompleteScreen}
      />
    </CardActivation.Navigator>
  );
};

export default CardActivationStack;
