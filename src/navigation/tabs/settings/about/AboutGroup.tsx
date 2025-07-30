import React from 'react';
import {Theme} from '@react-navigation/native';
import SessionLogs from './screens/SessionLog';
import SendFeedback, {SendFeedbackParamList} from './screens/SendFeedback';
import {useTranslation} from 'react-i18next';
import StorageUsage from './screens/StorageUsage';
import {Root} from '../../../../Root';
import {useStackScreenOptions} from '../../../utils/headerHelpers';

interface AboutProps {
  About: typeof Root;
  theme: Theme;
}

export type AboutGroupParamList = {
  StorageUsage: undefined;
  SessionLogs: undefined;
  SendFeedback: SendFeedbackParamList | undefined;
};

export enum AboutScreens {
  STORAGE_USAGE = 'StorageUsage',
  SESSION_LOGS = 'SessionLogs',
  SEND_FEEDBACK = 'SendFeedback',
}

const AboutGroup: React.FC<AboutProps> = ({About, theme}) => {
  const commonOptions = useStackScreenOptions(theme);
  const {t} = useTranslation();
  return (
    <About.Group screenOptions={commonOptions}>
      <About.Screen
        name={AboutScreens.STORAGE_USAGE}
        component={StorageUsage}
        options={{
          headerTitle: t('Storage Usage'),
        }}
      />
      <About.Screen
        name={AboutScreens.SESSION_LOGS}
        component={SessionLogs}
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
    </About.Group>
  );
};

export default AboutGroup;
