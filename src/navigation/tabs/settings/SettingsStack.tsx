import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {baseNavigatorOptions} from '../../../constants/NavigationOptions';
import SettingsHome from './SettingsRoot';
import {useTheme} from 'styled-components/native';

export type SettingsStackParamList = {
  SettingsHome: {
    redirectTo?: string;
  };
};

export enum SettingsScreens {
  SETTINGS_HOME = 'SettingsHome',
}

const Settings = createNativeStackNavigator<SettingsStackParamList>();

const SettingsStack = () => {
  const theme = useTheme();
  return (
    <Settings.Navigator
      initialRouteName={SettingsScreens.SETTINGS_HOME}
      screenOptions={() => ({
        ...baseNavigatorOptions,
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
      })}>
      <Settings.Screen
        name={SettingsScreens.SETTINGS_HOME}
        component={SettingsHome}
        options={{
          headerShown: false,
        }}
      />
    </Settings.Navigator>
  );
};

export default SettingsStack;
