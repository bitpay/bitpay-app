import React from 'react';
import {useTranslation} from 'react-i18next';
import {Theme} from '@react-navigation/native';
import EmailNotifications from './screens/EmailNotifications';
import {HeaderTitle} from '../../../../components/styled/Text';
import PushNotifications from './screens/PushNotifications';
import {Root} from '../../../../Root';
import {useStackScreenOptions} from '../../../utils/headerHelpers';

interface NotificationsProps {
  Notifications: typeof Root;
  theme: Theme;
}

export type NotificationsSettingsGroupParamsList = {
  EmailNotifications: undefined;
  PushNotifications: undefined;
};

export enum NotificationsSettingsScreens {
  EMAIL_NOTIFICATIONS = 'EmailNotifications',
  PUSH_NOTIFICATIONS = 'PushNotifications',
}

const NotificationsSettingsGroup: React.FC<NotificationsProps> = ({
  Notifications,
  theme,
}) => {
  const commonOptions = useStackScreenOptions(theme);
  const {t} = useTranslation();

  return (
    <Notifications.Group screenOptions={commonOptions}>
      <Notifications.Screen
        name={NotificationsSettingsScreens.EMAIL_NOTIFICATIONS}
        component={EmailNotifications}
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Email Notifications')}</HeaderTitle>
          ),
        }}
      />
      <Notifications.Screen
        name={NotificationsSettingsScreens.PUSH_NOTIFICATIONS}
        component={PushNotifications}
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Push Notifications')}</HeaderTitle>
          ),
        }}
      />
    </Notifications.Group>
  );
};
export default NotificationsSettingsGroup;
