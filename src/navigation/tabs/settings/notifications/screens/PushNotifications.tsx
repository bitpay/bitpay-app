import React, {useCallback, useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {selectSettingsNotificationState} from '../../../../../store/app/app.selectors';
import {Alert, View, Linking} from 'react-native';
import {AppEffects} from '../../../../../store/app';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import Checkbox from '../../../../../components/checkbox/Checkbox';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {useNavigation} from '@react-navigation/native';
import {sleep} from '../../../../../utils/helper-methods';

const PushNotifications = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();

  const notificationsState = useAppSelector(selectSettingsNotificationState);

  const [pushNotifications, setPushNotifications] = useState(
    notificationsState.pushNotifications,
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
          onPress: () => {
            navigation.goBack();
          },
          style: 'cancel',
        },
        {
          text: t('Change Settings'),
          onPress: async () => {
            Linking.openSettings();
            await sleep(300);
            navigation.goBack();
          },
        },
      ],
    );
  }, [t]);

  const checkSystemEnabled = async () => {
    const systemEnabled = await AppEffects.checkNotificationsPermissions();
    if (!systemEnabled) {
      openSettings();
    }
  };

  useEffect(() => {
    checkSystemEnabled();
  }, []);

  const [confirmedTx, setConfirmedTx] = useState(
    notificationsState.confirmedTx,
  );
  const [annnouncements, setAnnouncements] = useState(
    notificationsState.announcements,
  );

  const notificationsList = [
    {
      title: t('Enable Push Notifications'),
      checked: pushNotifications,
      onPress: async () => {
        const accepted = !pushNotifications;
        dispatch(AppEffects.setNotifications(accepted));
        setPushNotifications(accepted);

        setConfirmedTx(accepted);
        dispatch(AppEffects.setConfirmTxNotifications(accepted));

        setAnnouncements(accepted);
        dispatch(AppEffects.setAnnouncementsNotifications(accepted));
      },
    },
    {
      title: t('Transactions'),
      checked: confirmedTx,
      onPress: () => {
        if (!pushNotifications) {
          dispatch(AppEffects.setNotifications(true));
          setPushNotifications(true);
        }

        const accepted = !confirmedTx;
        setConfirmedTx(accepted);
        dispatch(AppEffects.setConfirmTxNotifications(accepted));
      },
    },
    {
      title: t('Announcements'),
      checked: annnouncements,
      onPress: () => {
        if (!pushNotifications) {
          dispatch(AppEffects.setNotifications(true));
          setPushNotifications(true);
        }

        const accepted = !annnouncements;
        setAnnouncements(accepted);
        dispatch(AppEffects.setAnnouncementsNotifications(accepted));
      },
    },
  ];

  return (
    <SettingsContainer>
      <Settings>
        <Hr />
        {notificationsList.map(({title, checked, onPress}, i) => (
          <View key={i}>
            <Setting onPress={onPress}>
              <SettingTitle>{title}</SettingTitle>
              <Checkbox radio={true} onPress={onPress} checked={checked} />
            </Setting>
            <Hr />
          </View>
        ))}
      </Settings>
    </SettingsContainer>
  );
};

export default PushNotifications;
