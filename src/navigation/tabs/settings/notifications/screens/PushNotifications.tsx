import React, {useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {selectSettingsNotificationState} from '../../../../../store/app/app.selectors';
import {View, DeviceEventEmitter} from 'react-native';
import {AppEffects} from '../../../../../store/app';
import {
  Hr,
  ScreenGutter,
  SettingDescription,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import {DeviceEmitterEvents} from '../../../../../constants/device-emitter-events';
import Checkbox from '../../../../../components/checkbox/Checkbox';
import {SettingsContainer} from '../../SettingsRoot';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import styled from 'styled-components/native';
import {dismissOnGoingProcessModal} from '../../../../../store/app/app.actions';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const SettingsComponent = styled.ScrollView`
  flex: 1;
  margin-top: 15px;
  padding: 0 ${ScreenGutter};
`;

const SettingRow = styled(View)`
  flex-grow: 1;
  justify-content: center;
  flex-direction: column;
  padding: 8px 0;
`;

const SettingRowContainer = styled(TouchableOpacity)`
  align-items: center;
  flex-direction: row;
  min-height: 58px;
`;

const PushNotifications = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();

  const notificationsState = useAppSelector(selectSettingsNotificationState);
  const visibleOnGoingProcess = useAppSelector(
    ({APP}) => APP.showOnGoingProcessModal,
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
        setPushNotifications(isEnabled);
        DeviceEventEmitter.emit(DeviceEmitterEvents.PUSH_NOTIFICATIONS, {
          isEnabled,
        });
      },
    },
  ];

  useEffect(() => {
    setPushNotifications(notificationsState.pushNotifications);
    if (visibleOnGoingProcess) {
      dispatch(dismissOnGoingProcessModal());
    }
  }, [notificationsState]);

  return (
    <SettingsContainer>
      <SettingsComponent>
        {notificationsList.map(({title, checked, onPress}, i) => {
          return (
            <View key={i}>
              <SettingRowContainer onPress={onPress}>
                <SettingRow style={{flex: 1}}>
                  <SettingTitle style={{flexGrow: 0}}>{title}</SettingTitle>
                </SettingRow>
                <Checkbox radio={true} onPress={onPress} checked={checked} />
              </SettingRowContainer>
              <Hr />
            </View>
          );
        })}
      </SettingsComponent>
    </SettingsContainer>
  );
};

export default PushNotifications;
