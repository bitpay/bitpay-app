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
import AuthenticationTwoFactorEmailScreen, {
  TwoFactorEmailScreenParamList,
} from './screens/AuthenticationTwoFactorEmailScreen';
import AuthenticationScreen, {
  AuthScreenParamList,
} from './screens/AuthenticationScreen';
import AuthenticationTwoFactorScreen, {
  TwoFactorAuthScreenParamList,
} from './screens/AuthenticationTwoFactorScreen';
import CompleteScreen, {
  CompleteScreenParamList,
} from './screens/CompleteScreen';
import RootScreen, {RootScreenParamList} from './screens/RootScreen';

export type CardActivationStackParamList = {
  Root: RootScreenParamList;
  Authentication: AuthScreenParamList;
  TwoFactorAuth: TwoFactorAuthScreenParamList;
  TwoFactorEmail: TwoFactorEmailScreenParamList;
  Activate: ActivateScreenParamList;
  Complete: CompleteScreenParamList;
};

export enum CardActivationScreens {
  ROOT = 'Root',
  AUTHENTICATION = 'Authentication',
  TWO_FACTOR_AUTH = 'TwoFactorAuth',
  TWO_FACTOR_EMAIL = 'TwoFactorEmail',
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
        name={CardActivationScreens.TWO_FACTOR_AUTH}
        component={AuthenticationTwoFactorScreen}
        options={{
          headerTitle: () => <HeaderTitle>2-Step Verification</HeaderTitle>,
        }}
      />
      <CardActivation.Screen
        name={CardActivationScreens.TWO_FACTOR_EMAIL}
        component={AuthenticationTwoFactorEmailScreen}
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
        options={{
          headerShown: false,
        }}
      />
    </CardActivation.Navigator>
  );
};

export default CardActivationStack;
