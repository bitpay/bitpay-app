import React, {useEffect, useCallback} from 'react';
import {
  Alert,
  Linking,
  LogBox,
  DeviceEventEmitter,
  Platform,
} from 'react-native';
import {AppEffects} from '../../../../store/app';
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
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {selectSettingsNotificationState} from '../../../../store/app/app.selectors';
import {DeviceEmitterEvents} from '../../../../constants/device-emitter-events';

const Notifications = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const notificationsState = useAppSelector(selectSettingsNotificationState);
  const navigation = useNavigation();

  const openSettings = useCallback(() => {
    Alert.alert(
      t('Notifications Disabled'),
      t(
        'If you want to get important updates on your account, new features, promos and more, go to Settings and tap Allow Notifications.',
      ),
      [
        {
          text: t('Cancel'),
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: t('Change Settings'),
          onPress: async () => {
            Linking.openSettings();
          },
        },
      ],
    );
  }, [t]);

  const setNotificationValue = useCallback(
    async (accepted: boolean) => {
      dispatch(AppEffects.setNotifications(accepted));
      dispatch(AppEffects.setConfirmTxNotifications(accepted));
      dispatch(AppEffects.setAnnouncementsNotifications(accepted));
      const systemEnabled = await AppEffects.checkNotificationsPermissions();
      if (!systemEnabled) {
        if (accepted) {
          if (Platform.OS === 'ios') {
            const requestPermissions =
              await AppEffects.requestNotificationsPermissions();
            if (requestPermissions) {
              return;
            }
          }
          dispatch(AppEffects.setNotifications(false));
          dispatch(AppEffects.setConfirmTxNotifications(false));
          dispatch(AppEffects.setAnnouncementsNotifications(false));
          openSettings();
        }
      }
    },
    [dispatch, openSettings],
  );

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      DeviceEmitterEvents.PUSH_NOTIFICATIONS,
      ({accepted}) => {
        setNotificationValue(accepted);
      },
    );
    return () => subscription.remove();
  }, [setNotificationValue]);

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
        onPress={() => navigation.navigate('PushNotifications')}>
        <SettingTitle>{t('Push Notifications')}</SettingTitle>
        <AngleRight />
      </Setting>
      <Hr />

      {/*----------------------------------------------------------------------*/}

      <Setting
        activeOpacity={ActiveOpacity}
        onPress={() => navigation.navigate('EmailNotifications')}>
        <SettingTitle>{t('Email Notifications')}</SettingTitle>
        <AngleRight />
      </Setting>
    </SettingsComponent>
  );
};

export default Notifications;
