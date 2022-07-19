import React, {useEffect, useCallback} from 'react';
import {
  Alert,
  AppState,
  AppStateStatus,
  Linking,
  Platform,
  LogBox,
} from 'react-native';
import {AppEffects} from '../../../../store/app';
import {
  ActiveOpacity,
  Setting,
  SettingTitle,
} from '../../../../components/styled/Containers';
import AngleRight from '../../../../../assets/img/angle-right.svg';
import {SettingsComponent} from '../SettingsRoot';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {selectSettingsNotificationState} from '../../../../store/app/app.selectors';

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
      const systemEnabled = await AppEffects.checkNotificationsPermissions();
      if (systemEnabled) {
        if (accepted !== notificationsState.pushNotifications) {
          dispatch(AppEffects.setNotifications(accepted));
        }
      } else {
        if (accepted && Platform.OS === 'ios') {
          const requestPermissions =
            await AppEffects.requestNotificationsPermissions();
          if (requestPermissions) {
            dispatch(AppEffects.setNotifications(accepted));
          } else {
            openSettings();
          }
        } else if (notificationsState.pushNotifications) {
          dispatch(AppEffects.setNotifications(false));
        }
      }
    },
    [dispatch, openSettings, notificationsState.pushNotifications],
  );

  useEffect(() => {
    function onAppStateChange(status: AppStateStatus) {
      // status === 'active' when the app goes from background to foreground,
      if (status === 'active') {
        setNotificationValue(notificationsState.pushNotifications);
      }
    }
    AppState.addEventListener('change', onAppStateChange);
    return () => AppState.removeEventListener('change', onAppStateChange);
  }, [dispatch, setNotificationValue, notificationsState.pushNotifications]);

  // Ignore warning: Setting a timer for long period of time...
  LogBox.ignoreLogs(['Setting a timer']);
  useEffect(() => {
    if (notificationsState && notificationsState.pushNotifications) {
      // Subscribe for silent push notifications
      const silentPushInterval = setInterval(() => {
        console.log('#### subscribing push notification');
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
