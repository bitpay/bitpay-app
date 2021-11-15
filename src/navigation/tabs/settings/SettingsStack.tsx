import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../constants/NavigationOptions';
import SessionLog from './SessionLog';
import SettingsHome from './SettingsHome';
import ThemeSettings from './Theme';

export type SettingsStackParamList = {
  Home: undefined;
  Theme: undefined;
  SessionLog: undefined;
};

export enum SettingsScreens {
  HOME = 'Home',
  THEME = 'Theme',
  SESSION_LOG = 'SessionLog',
}

const Settings = createStackNavigator<SettingsStackParamList>();

const SettingsStack = () => {
  return (
    <Settings.Navigator
      initialRouteName={SettingsScreens.HOME}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <Settings.Screen
        name={SettingsScreens.HOME}
        component={SettingsHome}
        options={{
          title: 'Settings',
        }}
      />
      <Settings.Screen
        name={SettingsScreens.THEME}
        component={ThemeSettings}
        options={{
          title: 'Theme',
        }}
      />
      <Settings.Screen
        name={SettingsScreens.SESSION_LOG}
        component={SessionLog}
        options={{
          title: 'Session Log',
        }}
      />
    </Settings.Navigator>
  );
};

export default SettingsStack;
