import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {selectSettingsNotificationState} from '../../../../../store/app/app.selectors';
import {View, DeviceEventEmitter} from 'react-native';
import {AppEffects} from '../../../../../store/app';
import {
  Hr,
  Setting,
  SettingDescription,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import {DeviceEmitterEvents} from '../../../../../constants/device-emitter-events';
import Checkbox from '../../../../../components/checkbox/Checkbox';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import styled from 'styled-components/native';

const SettingRow = styled(View)`
  flex-grow: 1;
  justify-content: center;
  flex-direction: column;
  padding: 8px 0;
`;

const PushNotifications = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();

  const notificationsState = useAppSelector(selectSettingsNotificationState);

  const [confirmedTx, setConfirmedTx] = useState(
    notificationsState.confirmedTx,
  );
  const [annnouncements, setAnnouncements] = useState(
    notificationsState.announcements,
  );
  const [pushNotifications, setPushNotifications] = useState(
    notificationsState.pushNotifications,
  );

  const notificationsList = [
    {
      title: t('Enable Push Notifications'),
      checked: pushNotifications,
      onPress: async () => {
        const accepted = !pushNotifications;
        DeviceEventEmitter.emit(DeviceEmitterEvents.PUSH_NOTIFICATIONS, {
          accepted,
        });
      },
    },
    {
      title: t('Transactions'),
      checked: confirmedTx,
      description: t('Automated alerts about wallet or card.'),
      onPress: () => {
        const accepted = !confirmedTx;
        setConfirmedTx(accepted);
        dispatch(AppEffects.setConfirmTxNotifications(accepted));
        if (!pushNotifications) {
          DeviceEventEmitter.emit(DeviceEmitterEvents.PUSH_NOTIFICATIONS, {
            accepted: true,
          });
        }
      },
    },
    {
      title: t('Announcements'),
      checked: annnouncements,
      description: t('Updates on new features and other relevant news.'),
      onPress: () => {
        const accepted = !annnouncements;
        setAnnouncements(accepted);
        dispatch(AppEffects.setAnnouncementsNotifications(accepted));
        if (!pushNotifications) {
          DeviceEventEmitter.emit(DeviceEmitterEvents.PUSH_NOTIFICATIONS, {
            accepted: true,
          });
        }
      },
    },
  ];

  useEffect(() => {
    setPushNotifications(notificationsState.pushNotifications);
    setConfirmedTx(notificationsState.confirmedTx);
    setAnnouncements(notificationsState.announcements);
  }, [notificationsState]);

  return (
    <SettingsContainer>
      <Settings>
        <Hr />
        {notificationsList.map(({title, checked, onPress, description}, i) => (
          <View key={i}>
            <Setting onPress={onPress}>
              <SettingRow>
                <SettingTitle style={{flexGrow: 0}}>{title}</SettingTitle>

                {description ? (
                  <SettingDescription>{description}</SettingDescription>
                ) : null}
              </SettingRow>

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
