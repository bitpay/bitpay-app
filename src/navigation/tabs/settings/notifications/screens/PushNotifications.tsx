import React, {useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {selectSettingsNotificationState} from '../../../../../store/app/app.selectors';
import {View, DeviceEventEmitter} from 'react-native';
import {AppEffects} from '../../../../../store/app';
import {
  Hr,
  SettingDescription,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import {DeviceEmitterEvents} from '../../../../../constants/device-emitter-events';
import Checkbox from '../../../../../components/checkbox/Checkbox';
import {SettingsContainer, SettingsComponent} from '../../SettingsRoot';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import styled from 'styled-components/native';
import {startOnGoingProcessModal} from '../../../../../store/app/app.effects';
import {dismissOnGoingProcessModal} from '../../../../../store/app/app.actions';

const SettingRow = styled(View)`
  flex-grow: 1;
  justify-content: center;
  flex-direction: column;
  padding: 8px 0;
`;

const SettingRowContainer = styled.TouchableOpacity<{isDisabled: boolean}>`
  align-items: center;
  flex-direction: row;
  min-height: 58px;
  opacity: ${({isDisabled}) => (isDisabled ? 0.5 : 1)};
`;

const PushNotifications = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();

  const notificationsState = useAppSelector(selectSettingsNotificationState);
  const visibleOnGoingProcess = useAppSelector(({APP}) => APP.showOnGoingProcessModal);

  const [confirmedTx, setConfirmedTx] = useState(
    notificationsState.confirmedTx,
  );
  const [announcements, setAnnouncements] = useState(
    notificationsState.announcements,
  );
  const [pushNotifications, setPushNotifications] = useState(
    notificationsState.pushNotifications,
  );

  const notificationsList = [
    {
      id: 'push',
      title: t('Enable Push Notifications'),
      checked: pushNotifications,
      onPress: async () => {
        const isEnabled = !pushNotifications;
        dispatch(startOnGoingProcessModal('LOADING'));
        DeviceEventEmitter.emit(DeviceEmitterEvents.PUSH_NOTIFICATIONS, {
          isEnabled,
        });
      },
    },
    {
      id: 'transactions',
      title: t('Transactions'),
      checked: confirmedTx,
      description: t('Automated alerts about wallet or card.'),
      onPress: () => {
        const isEnabled = !confirmedTx;
        dispatch(AppEffects.setConfirmTxNotifications(isEnabled));
      },
    },
    {
      id: 'announcements',
      title: t('Announcements'),
      checked: announcements,
      description: t('Updates on new features and other relevant news.'),
      onPress: () => {
        const isEnabled = !announcements;
        dispatch(AppEffects.setAnnouncementsNotifications(isEnabled));
      },
    },
  ];

  useEffect(() => {
    setPushNotifications(notificationsState.pushNotifications);
    setAnnouncements(notificationsState.announcements);
    setConfirmedTx(notificationsState.confirmedTx);
    if (visibleOnGoingProcess) {
      dispatch(dismissOnGoingProcessModal());
    }
  }, [notificationsState]);

  return (
    <SettingsContainer>
      <SettingsComponent>
        <Hr />
        {notificationsList.map(
          ({id, title, checked, onPress, description}, i) => {
            const disabled = ['transactions', 'announcements'].includes(id)
              ? !pushNotifications
              : false;
            return (
              <View key={i}>
                <SettingRowContainer
                  isDisabled={disabled}
                  disabled={disabled}
                  onPress={onPress}>
                  <SettingRow style={{flex: 1}}>
                    <SettingTitle style={{flexGrow: 0}}>{title}</SettingTitle>

                    {description ? (
                      <SettingDescription>{description}</SettingDescription>
                    ) : null}
                  </SettingRow>
                  <Checkbox
                    radio={true}
                    onPress={onPress}
                    checked={checked}
                    disabled={disabled}
                  />
                </SettingRowContainer>
                <Hr />
              </View>
            );
          },
        )}
      </SettingsComponent>
    </SettingsContainer>
  );
};

export default PushNotifications;
