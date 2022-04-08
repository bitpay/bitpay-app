import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../../constants/NavigationOptions';

import SessionLogsScreen, {SessionLogsParamList} from './screens/SessionLog';

export type AboutStackParamList = {
  SessionLogs: SessionLogsParamList | undefined;
};

export enum AboutScreens {
  SESSION_LOGS = 'SessionLogs',
}

const About = createStackNavigator<AboutStackParamList>();

const AboutStack = () => {
  return (
    <About.Navigator
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <About.Screen
        name={AboutScreens.SESSION_LOGS}
        component={SessionLogsScreen}
        options={{
          headerTitle: 'Session Logs',
        }}
      />
    </About.Navigator>
  );
};

export default AboutStack;
