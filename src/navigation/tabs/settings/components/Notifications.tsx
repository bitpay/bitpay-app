import React, {useCallback, useEffect, useState} from 'react';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {RootState} from '../../../../store';
import {AppEffects} from '../../../../store/app';
import {SettingsComponent} from '../SettingsRoot';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../components/styled/Containers';
import Checkbox from '../../../../components/checkbox/Checkbox';
import {Alert, View, AppState, AppStateStatus, Linking} from 'react-native';

const Notifications = () => {
  const dispatch = useAppDispatch();
  const notificationsState = useAppSelector(({APP}: RootState) => {
    return {
      pushNotifications: APP.notificationsAccepted,
      confirmedTx: APP.confirmedTxAccepted,
      productsUpdates: APP.productsUpdatesAccepted,
      offersAndPromotions: APP.offersAndPromotionsAccepted,
    };
  });
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
      'Notifications Disabled',
      'If you want to get important updates on your account, new features, promos and more, go to Settings and tap Allow Notifications.',
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Change Settings',
          onPress: () => {
            Linking.openSettings();
          },
        },
      ],
    );
  }, []);

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
    [dispatch, notificationsState, openSettings],
  );

  const notificationsList = [
    {
      title: 'Enable Push Notifications',
      checked: pushNotifications,
      show: true,
      onPress: () => {
        const accepted = !pushNotifications;
        setNotificationValue(accepted);
      },
    },
    {
      title: 'Confirmed Transactions',
      checked: confirmedTx,
      show: pushNotifications,
      onPress: () => {
        const accepted = !confirmedTx;
        setConfirmedTx(accepted);
        dispatch(AppEffects.setConfirmTxNotifications(accepted));
      },
    },
    {
      title: 'Product Updates',
      checked: productsUpdates,
      show: pushNotifications,
      onPress: () => {
        const accepted = !productsUpdates;
        setProductsUpdates(accepted);
        dispatch(AppEffects.setProductsUpdatesNotifications(accepted));
      },
    },
    {
      title: 'Offers & Promotions',
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
  }, [dispatch, setNotificationValue, notificationsState]);

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
