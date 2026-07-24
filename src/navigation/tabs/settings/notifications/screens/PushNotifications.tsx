import React, {useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {selectSettingsNotificationState} from '../../../../../store/app/app.selectors';
import {View, DeviceEventEmitter, ScrollView, StyleSheet} from 'react-native';
import {
  Hr,
  ScreenGutter,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import {DeviceEmitterEvents} from '../../../../../constants/device-emitter-events';
import ToggleSwitch from '../../../../../components/toggle-switch/ToggleSwitch';
import {SettingsContainer} from '../../SettingsRoot';
import {useAppSelector} from '../../../../../utils/hooks';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const styles = StyleSheet.create({
  settingsComponent: {
    flex: 1,
    marginTop: 15,
    paddingHorizontal: parseInt(ScreenGutter, 10),
  },
  settingRow: {
    flexGrow: 1,
    justifyContent: 'center',
    flexDirection: 'column',
    paddingVertical: 8,
  },
  settingRowContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 58,
  },
});

const SettingsComponent = ({
  style,
  ...rest
}: React.ComponentProps<typeof ScrollView>) => (
  <ScrollView style={[styles.settingsComponent, style]} {...rest} />
);

const SettingRow = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.settingRow, style]} {...rest} />
);

const SettingRowContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof TouchableOpacity>) => (
  <TouchableOpacity style={[styles.settingRowContainer, style]} {...rest} />
);

const PushNotifications = () => {
  const {t} = useTranslation();

  const notificationsState = useAppSelector(selectSettingsNotificationState);

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
                <ToggleSwitch onChange={onPress} isEnabled={checked} />
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
