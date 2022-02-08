import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../../components/styled/Text';
import AboutRoot, {AboutRootParamList} from './screens/AboutRoot';

import SessionLogsScreen, {SessionLogsParamList} from './screens/SessionLog';

export type AboutStackParamList = {
  Root: AboutRootParamList | undefined;
  SessionLogs: SessionLogsParamList | undefined;
};

export enum AboutScreens {
  ROOT = 'Root',
  SESSION_LOGS = 'SessionLogs',
}

const About = createStackNavigator<AboutStackParamList>();

const AboutStack = () => {
  const {t} = useTranslation();
  return (
    <About.Navigator
      initialRouteName={AboutScreens.ROOT}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <About.Screen
        name={AboutScreens.ROOT}
        component={AboutRoot}
        options={{
          headerTitle: () => <HeaderTitle>{t('About BitPay')}</HeaderTitle>,
        }}
      />
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
