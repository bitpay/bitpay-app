import React, {useCallback} from 'react';
import {
  ActiveOpacity,
  Hr,
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

  const openPushNotifications = useCallback(
    () => navigation.navigate('PushNotifications'),
    [navigation],
  );
  const openEmailNotifications = useCallback(
    () => navigation.navigate('EmailNotifications'),
    [navigation],
  );

  return (
    <SettingsComponent>
      <Setting
        activeOpacity={ActiveOpacity}
        testID="settings-push-notifications-row"
        accessibilityLabel="Push notifications"
        onPress={openPushNotifications}>
        <SettingTitle>{t('Push Notifications')}</SettingTitle>
        <AngleRight />
      </Setting>
      <Hr />

      {/*----------------------------------------------------------------------*/}

      <Setting
        activeOpacity={ActiveOpacity}
        testID="settings-email-notifications-row"
        accessibilityLabel="Email notifications"
        onPress={openEmailNotifications}>
        <SettingTitle>{t('Email Notifications')}</SettingTitle>
        <AngleRight />
      </Setting>
    </SettingsComponent>
  );
};

export default React.memo(Notifications);
