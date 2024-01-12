import React from 'react';
import EmailNotifications from './screens/EmailNotifications';
import {HeaderTitle} from '../../../../components/styled/Text';
import PushNotifications from './screens/PushNotifications';
import {useTranslation} from 'react-i18next';
import {Root} from '../../../../Root';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderBackButton} from '@react-navigation/elements';

interface NotificationsProps {
  Notifications: typeof Root;
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
}) => {
  const {t} = useTranslation();

  return (
    <Notifications.Group
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
