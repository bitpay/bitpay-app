import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../../../constants/NavigationOptions';

import SessionLogsScreen, {SessionLogsParamList} from './screens/SessionLog';
import SendFeedback, {SendFeedbackParamList} from './screens/SendFeedback';
import {useTranslation} from 'react-i18next';
import StorageUsage from './screens/StorageUsage';
import {HeaderBackButton} from '@react-navigation/elements';

export type AboutStackParamList = {
  StorageUsage: undefined;
  SessionLogs: SessionLogsParamList | undefined;
  SendFeedback: SendFeedbackParamList | undefined;
};

export enum AboutScreens {
  STORAGE_USAGE = 'StorageUsage',
  SESSION_LOGS = 'SessionLogs',
  SEND_FEEDBACK = 'SendFeedback',
}

const About = createNativeStackNavigator<AboutStackParamList>();

const AboutStack = () => {
  const {t} = useTranslation();
  return (
    <About.Navigator
      screenOptions={({navigation}) => ({
        ...baseNavigatorOptions,
        headerLeft: () => (
          <HeaderBackButton
            onPress={() => {
              navigation.goBack();
            }}
            {...baseNativeHeaderBackButtonProps}
          />
        ),
      })}>
      <About.Screen
        name={AboutScreens.STORAGE_USAGE}
        component={StorageUsage}
        options={{
          headerTitle: t('Storage Usage'),
        }}
      />
      <About.Screen
        name={AboutScreens.SESSION_LOGS}
        component={SessionLogsScreen}
        options={{
          headerTitle: t('Session Logs'),
        }}
      />

      <About.Screen
        name={AboutScreens.SEND_FEEDBACK}
        component={SendFeedback}
        options={{
          headerTitle: t('Send Feedback'),
        }}
      />
    </About.Navigator>
  );
};

export default AboutStack;
