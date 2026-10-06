import React, {useCallback, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {selectNotificationsAccepted} from '../../../../../store/app/app.selectors';
import {Alert, Linking, View, ScrollView, StyleSheet} from 'react-native';
import {
  Hr,
  ScreenGutter,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import ToggleSwitch from '../../../../../components/toggle-switch/ToggleSwitch';
import {SettingsContainer} from '../../SettingsRoot';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {AppEffects} from '../../../../../store/app';

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
  settingRowContent: {
    flex: 1,
  },
  settingTitle: {
    flexGrow: 0,
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
  const dispatch = useAppDispatch();
  const notificationsAccepted = useAppSelector(selectNotificationsAccepted);
  const [pendingPreference, setPendingPreference] = useState<boolean | null>(
    null,
  );
  const isUpdatingRef = useRef(false);
  const pushNotifications = pendingPreference ?? notificationsAccepted;

  const openSettings = useCallback(() => {
    Alert.alert(
      t('Notifications Disabled'),
      t(
        'If you want to get important updates on your account, new features, promos and more, go to Settings and tap Allow Notifications.',
      ),
      [
        {text: t('Cancel'), style: 'cancel'},
        {
          text: t('Change Settings'),
          onPress: () => Linking.openSettings(),
        },
      ],
    );
  }, [t]);

  const onPress = useCallback(async () => {
    if (isUpdatingRef.current) {
      return;
    }

    const nextPreference = !pushNotifications;
    isUpdatingRef.current = true;
    setPendingPreference(nextPreference);

    try {
      const systemEnabled = nextPreference
        ? await AppEffects.checkNotificationsPermissions()
        : true;
      const permissionGranted =
        systemEnabled ||
        (nextPreference
          ? await AppEffects.requestNotificationsPermissions()
          : true);

      if (permissionGranted) {
        dispatch(AppEffects.setNotifications(nextPreference));
      } else {
        openSettings();
      }
    } finally {
      isUpdatingRef.current = false;
      setPendingPreference(null);
    }
  }, [dispatch, openSettings, pushNotifications]);

  return (
    <SettingsContainer>
      <SettingsComponent>
        <View>
          <SettingRowContainer
            disabled={pendingPreference !== null}
            onPress={onPress}>
            <SettingRow style={styles.settingRowContent}>
              <SettingTitle style={styles.settingTitle}>
                {t('Enable Push Notifications')}
              </SettingTitle>
            </SettingRow>
            <ToggleSwitch onChange={onPress} isEnabled={pushNotifications} />
          </SettingRowContainer>
          <Hr />
        </View>
      </SettingsComponent>
    </SettingsContainer>
  );
};

export default React.memo(PushNotifications);
