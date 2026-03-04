import React from 'react';
import {Theme} from '@react-navigation/native';
import SessionLogs from './screens/SessionLog';
import SendFeedback, {SendFeedbackParamList} from './screens/SendFeedback';
import {useTranslation} from 'react-i18next';
import StorageUsage from './screens/StorageUsage';
import PortfolioDebug from './screens/PortfolioDebug';
import PortfolioWalletDebug from './screens/PortfolioWalletDebug';
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
  PortfolioDebug: undefined;
  PortfolioWalletDebug: {walletId: string};
};

export enum AboutScreens {
  STORAGE_USAGE = 'StorageUsage',
  SESSION_LOGS = 'SessionLogs',
  SEND_FEEDBACK = 'SendFeedback',
  PORTFOLIO_DEBUG = 'PortfolioDebug',
  PORTFOLIO_WALLET_DEBUG = 'PortfolioWalletDebug',
}

const AboutGroup = ({About, theme}: AboutProps) => {
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

      <About.Screen
        name={AboutScreens.PORTFOLIO_DEBUG}
        component={PortfolioDebug}
        options={{
          headerTitle: t('Portfolio (Raw)'),
        }}
      />

      <About.Screen
        name={AboutScreens.PORTFOLIO_WALLET_DEBUG}
        component={PortfolioWalletDebug}
        options={{
          headerTitle: t('Portfolio Wallet (Raw)'),
        }}
      />
    </About.Group>
  );
};

export default AboutGroup;
