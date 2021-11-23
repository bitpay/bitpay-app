import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../../components/styled/Text';
import SecurityRoot from './screens/SecurityRoot';

export type SecuritySettingsStackParamList = {
  Root: undefined;
};

export enum SecuritySettingsScreens {
  ROOT = 'Root',
}

const SecuritySettings = createStackNavigator<SecuritySettingsStackParamList>();

const SecuritySettingsStack = () => {
  return (
    <SecuritySettings.Navigator
      initialRouteName={SecuritySettingsScreens.ROOT}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <SecuritySettings.Screen
        name={SecuritySettingsScreens.ROOT}
        component={SecurityRoot}
        options={{
          headerTitle: () => <HeaderTitle>Security</HeaderTitle>,
        }}
      />
    </SecuritySettings.Navigator>
  );
};

export default SecuritySettingsStack;
