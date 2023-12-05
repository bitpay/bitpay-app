import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../../../constants/NavigationOptions';
import EmailNotifications from './screens/EmailNotifications';
import {HeaderTitle} from '../../../../components/styled/Text';
import PushNotifications from './screens/PushNotifications';
import {useTranslation} from 'react-i18next';
import {HeaderBackButton} from '@react-navigation/elements';

export type NotificationsSettingsStackParamsList = {
  EmailNotifications: undefined;
  PushNotifications: undefined;
};

export enum NotificationsSettingsScreens {
  EMAIL_NOTIFICATIONS = 'EmailNotifications',
  PUSH_NOTIFICATIONS = 'PushNotifications',
}
const Notifications =
  createNativeStackNavigator<NotificationsSettingsStackParamsList>();

const NotificationsSettingsStack = () => {
  const {t} = useTranslation();

  return (
    <Notifications.Navigator
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
    </Notifications.Navigator>
  );
};
export default NotificationsSettingsStack;
