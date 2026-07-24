import React, {useState} from 'react';
import {SafeAreaView, ScrollView, StyleSheet, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import Checkbox from '../../../../../components/checkbox/Checkbox';
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
    style={[styles.settingRowContainer, {opacity: isDisabled ? 0.5 : 1}, style]}
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
  const [notificationsAccepted, setNotificationsAccepted] = useState(
    !!emailNotifications?.accepted,
  );

  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const [currentEmail, setCurrentEmail] = useState(
    user?.email || emailNotifications?.email,
  );

  const dispatch = useAppDispatch();

  const onPress = () => {
    const accepted = !notificationsAccepted;

    if (!accepted) {
      dispatch(setEmailNotifications(accepted, null));
      setNotificationsAccepted(accepted);
    } else if (user) {
      const {email} = user;
      setCurrentEmail(email);
      dispatch(setEmailNotifications(accepted, email));
      setNotificationsAccepted(accepted);
    }
  };

  return (
    <EmailNotificationsContainer>
      <SettingsContainer>
        <SettingsComponent>
          <SettingRowContainer
            disabled={!user}
            isDisabled={!user}
            onPress={onPress}>
            <SettingRow style={{flex: 1}}>
              <SettingTitle style={{flexGrow: 0}}>
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

export default EmailNotifications;
