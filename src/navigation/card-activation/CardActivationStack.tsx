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
import CompleteScreen, {
  CompleteScreenParamList,
} from './screens/CompleteScreen';
import RootScreen, {RootScreenParamList} from './screens/RootScreen';

export type CardActivationStackParamList = {
  Root: RootScreenParamList;
  Activate: ActivateScreenParamList;
  Complete: CompleteScreenParamList;
};

export enum CardActivationScreens {
  ROOT = 'Root',
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
