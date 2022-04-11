import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../../constants/NavigationOptions';

import SessionLogsScreen, {SessionLogsParamList} from './screens/SessionLog';
import SendFeedback from './screens/SendFeedback';

export type AboutStackParamList = {
  SessionLogs: SessionLogsParamList | undefined;
  SendFeedback: undefined;
};

export enum AboutScreens {
  SESSION_LOGS = 'SessionLogs',
  SEND_FEEDBACK = 'SendFeedback',
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

      <About.Screen
        name={AboutScreens.SEND_FEEDBACK}
        component={SendFeedback}
        options={{
          headerTitle: 'Send Feedback',
        }}
      />
    </About.Navigator>
  );
};

export default AboutStack;
