import React from 'react';
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
import {View} from 'react-native';

const Notifications = () => {
  // TODO: Update me
  const dispatch = useAppDispatch();
  const p = useAppSelector(({APP}: RootState) => {
    return {
      notificationsAccepted: APP.notificationsAccepted,
      confirmedTxAccepted: APP.confirmedTxAccepted,
      productsUpdatesAccepted: APP.productsUpdatesAccepted,
      offersAndPromotionsAccepted: APP.offersAndPromotionsAccepted,
    };
  });

  const notificationsList = [
    {
      title: 'Enable Push Notifications',
      checked: !!p.notificationsAccepted,
      show: true,
      onPress: () => {
        const accepted = !p.notificationsAccepted;
        dispatch(AppEffects.setNotifications(accepted));
        if (!accepted) {
          dispatch(AppEffects.setConfirmTxNotifications(false));
          dispatch(AppEffects.setProductsUpdatesNotifications(false));
          dispatch(AppEffects.setOffersAndPromotionsNotifications(false));
        }
      },
    },
    {
      title: 'Confirmed Transactions',
      checked: !!p.confirmedTxAccepted,
      show: !!p.notificationsAccepted,
      onPress: () => {
        dispatch(AppEffects.setConfirmTxNotifications(!p.confirmedTxAccepted));
      },
    },
    {
      title: 'Product Updates',
      checked: !!p.productsUpdatesAccepted,
      show: !!p.notificationsAccepted,
      onPress: () => {
        dispatch(
          AppEffects.setProductsUpdatesNotifications(
            !p.productsUpdatesAccepted,
          ),
        );
      },
    },
    {
      title: 'Offers & Promotions',
      checked: !!p.offersAndPromotionsAccepted,
      show: !!p.notificationsAccepted,
      onPress: () => {
        dispatch(
          AppEffects.setOffersAndPromotionsNotifications(
            !p.offersAndPromotionsAccepted,
          ),
        );
      },
    },
  ];

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
