import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../constants/NavigationOptions';
import SettingsRoot from './SettingsRoot';
import {HeaderTitle} from '../../../components/styled/Text';

export type SettingsStackParamList = {
  Root: undefined;
};

export enum SettingsScreens {
  Root = 'Root',
}

const Settings = createStackNavigator<SettingsStackParamList>();

const SettingsStack = () => {
  return (
    <Settings.Navigator
      initialRouteName={SettingsScreens.Root}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <Settings.Screen
        name={SettingsScreens.Root}
        component={SettingsRoot}
        options={{
          headerTitle: () => <HeaderTitle>Settings</HeaderTitle>,
        }}
      />
    </Settings.Navigator>
  );
};

export default SettingsStack;
