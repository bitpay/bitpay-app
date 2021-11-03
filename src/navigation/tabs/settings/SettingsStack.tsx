import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import SettingsHome from './SettingsHome';
import SessionLog from './SessionLog';
import { baseNavigatorOptions, baseScreenOptions } from '../../../constants/NavigationOptions';

export type SettingsStackParamList = {
  Home: undefined;
  SessionLog: undefined;
};

const SettingsStack = () => {
  const Settings = createStackNavigator<SettingsStackParamList>();

  return (
    <Settings.Navigator initialRouteName="Home" screenOptions={{
      ...baseNavigatorOptions,
      ...baseScreenOptions
    }}>
      <Settings.Screen name="Home" component={SettingsHome} options={{
        title: 'Settings'
      }} />
      <Settings.Screen name="SessionLog" component={SessionLog} options={{
        title: 'Session Log'
      }} />
    </Settings.Navigator>
  );
};

export default SettingsStack;
