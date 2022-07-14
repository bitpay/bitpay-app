import React, {useCallback, useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Alert, View, AppState, AppStateStatus, Linking} from 'react-native';
import Checkbox from '../../../../components/checkbox/Checkbox';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../components/styled/Containers';
import {AppEffects} from '../../../../store/app';
import {selectSettingsNotificationState} from '../../../../store/app/app.selectors';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {SettingsComponent} from '../SettingsRoot';

const Notifications = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();

  const notificationsState = useAppSelector(selectSettingsNotificationState);

  const [pushNotifications, setPushNotifications] = useState(
    notificationsState.pushNotifications,
  );
  const [confirmedTx, setConfirmedTx] = useState(
    notificationsState.confirmedTx,
  );
  const [productsUpdates, setProductsUpdates] = useState(
    notificationsState.productsUpdates,
  );
  const [offersAndPromotions, setOffersAndPromotions] = useState(
    notificationsState.offersAndPromotions,
  );

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
          onPress: () => {
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
          setPushNotifications(accepted);
          dispatch(AppEffects.setNotifications(accepted));
        }
      } else {
        openSettings();
        if (notificationsState.pushNotifications) {
          setPushNotifications(false);
          dispatch(AppEffects.setNotifications(false));
        }
      }
    },
    [dispatch, openSettings, notificationsState.pushNotifications],
  );

  const notificationsList = [
    {
      title: t('Enable Push Notifications'),
      checked: pushNotifications,
      show: true,
      onPress: () => {
        const accepted = !pushNotifications;
        setNotificationValue(accepted);
      },
    },
    {
      title: t('Confirmed Transactions'),
      checked: confirmedTx,
      show: pushNotifications,
      onPress: () => {
        const accepted = !confirmedTx;
        setConfirmedTx(accepted);
        dispatch(AppEffects.setConfirmTxNotifications(accepted));
      },
    },
    {
      title: t('Product Updates'),
      checked: productsUpdates,
      show: pushNotifications,
      onPress: () => {
        const accepted = !productsUpdates;
        setProductsUpdates(accepted);
        dispatch(AppEffects.setProductsUpdatesNotifications(accepted));
      },
    },
    {
      title: t('Offers & Promotions'),
      checked: offersAndPromotions,
      show: pushNotifications,
      onPress: () => {
        const accepted = !offersAndPromotions;
        setOffersAndPromotions(accepted);
        dispatch(AppEffects.setOffersAndPromotionsNotifications(accepted));
      },
    },
  ];

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
      {notificationsList.map(({title, checked, onPress, show}, i) =>
        show ? (
          <View key={i}>
            {i !== 0 ? <Hr /> : null}
            <Setting onPress={onPress}>
              <SettingTitle>{title}</SettingTitle>
              <Checkbox onPress={onPress} checked={checked} />
            </Setting>
          </View>
        ) : null,
      )}
    </SettingsComponent>
  );
};

export default Notifications;
