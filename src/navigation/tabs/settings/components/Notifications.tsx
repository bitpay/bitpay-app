import React, {useCallback, useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  Alert,
  View,
  AppState,
  AppStateStatus,
  Linking,
  LogBox,
} from 'react-native';
import Checkbox from '../../../../components/checkbox/Checkbox';
import {
  ActiveOpacity,
  Setting,
  SettingTitle,
} from '../../../../components/styled/Containers';
import AngleRight from '../../../../../assets/img/angle-right.svg';
import {SettingsComponent} from '../SettingsRoot';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';

const Notifications = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  // Ignore warning: Setting a timer for long period of time...
  LogBox.ignoreLogs(['Setting a timer']);

  useEffect(() => {
    if (notificationsState && notificationsState.pushNotifications) {
      // Subscribe for silent push notifications
      const silentPushInterval = setInterval(() => {
        dispatch(AppEffects.renewSubscription());
      }, 3 * 60 * 1000); // 3 min
      return () => clearInterval(silentPushInterval);
    }
  }, [dispatch, notificationsState]);

  return (
    <SettingsComponent>
      <Setting
        activeOpacity={ActiveOpacity}
        onPress={() =>
          navigation.navigate('NotificationsSettings', {
            screen: 'PushNotifications',
          })
        }>
        <SettingTitle>{t('Push Notifications')}</SettingTitle>
        <AngleRight />
      </Setting>

      {/*----------------------------------------------------------------------*/}

      <Setting
        activeOpacity={ActiveOpacity}
        onPress={() =>
          navigation.navigate('NotificationsSettings', {
            screen: 'EmailNotifications',
          })
        }>
        <SettingTitle>{t('Email Notifications')}</SettingTitle>
        <AngleRight />
      </Setting>
    </SettingsComponent>
  );
};

export default Notifications;
