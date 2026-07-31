import React, {useCallback} from 'react';
import {SafeAreaView, ScrollView, StyleSheet, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {setEmailNotifications} from '../../../../../store/app/app.effects';
import {SettingsContainer} from '../../SettingsRoot';
import {
  ScreenGutter,
  SettingTitle,
  SettingDescription,
  Hr,
} from '../../../../../components/styled/Containers';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import ToggleSwitch from '../../../../../components/toggle-switch/ToggleSwitch';

const styles = StyleSheet.create({
  emailNotificationsContainer: {
    flex: 1,
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
  settingsComponent: {
    flex: 1,
    marginTop: 15,
    paddingHorizontal: parseInt(ScreenGutter, 10),
  },
  disabled: {
    opacity: 0.5,
  },
  settingRowContent: {
    flex: 1,
  },
  settingTitle: {
    flexGrow: 0,
  },
});

const EmailNotificationsContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof SafeAreaView>) => (
  <SafeAreaView style={[styles.emailNotificationsContainer, style]} {...rest} />
);

const SettingRow = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.settingRow, style]} {...rest} />
);

const SettingRowContainer = ({
  isDisabled,
  style,
  ...rest
}: {isDisabled?: boolean} & React.ComponentProps<typeof TouchableOpacity>) => (
  <TouchableOpacity
    style={[
      styles.settingRowContainer,
      isDisabled ? styles.disabled : null,
      style,
    ]}
    {...rest}
  />
);

const SettingsComponent = ({
  style,
  ...rest
}: React.ComponentProps<typeof ScrollView>) => (
  <ScrollView style={[styles.settingsComponent, style]} {...rest} />
);

const EmailNotifications = () => {
  const {t} = useTranslation();
  const network = useAppSelector(({APP}) => APP.network);
  const emailNotifications = useAppSelector(({APP}) => APP.emailNotifications);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const dispatch = useAppDispatch();
  const notificationsAccepted = !!emailNotifications?.accepted;
  const currentEmail = user?.email || emailNotifications?.email;

  const onPress = useCallback(() => {
    if (!user) {
      return;
    }

    const accepted = !notificationsAccepted;
    dispatch(setEmailNotifications(accepted, accepted ? user.email : null));
  }, [dispatch, notificationsAccepted, user]);

  return (
    <EmailNotificationsContainer>
      <SettingsContainer>
        <SettingsComponent>
          <SettingRowContainer
            disabled={!user}
            isDisabled={!user}
            onPress={onPress}>
            <SettingRow style={styles.settingRowContent}>
              <SettingTitle style={styles.settingTitle}>
                {t('Enable Email Notifications')}
              </SettingTitle>
              {currentEmail ? (
                <SettingDescription>{currentEmail}</SettingDescription>
              ) : null}
            </SettingRow>
            <ToggleSwitch
              onChange={onPress}
              isEnabled={notificationsAccepted}
            />
          </SettingRowContainer>
          <Hr />
        </SettingsComponent>
      </SettingsContainer>
    </EmailNotificationsContainer>
  );
};

export default React.memo(EmailNotifications);
