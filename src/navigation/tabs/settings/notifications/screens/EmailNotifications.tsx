import React, {useState} from 'react';
import styled from 'styled-components/native';
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

const EmailNotificationsContainer = styled.SafeAreaView`
  flex: 1;
`;

const SettingRow = styled.View`
  flex-grow: 1;
  justify-content: center;
  flex-direction: column;
  padding: 8px 0;
`;

const SettingRowContainer = styled(TouchableOpacity)<{isDisabled?: boolean}>`
  align-items: center;
  flex-direction: row;
  min-height: 58px;
  opacity: ${({isDisabled}) => (isDisabled ? 0.5 : 1)};
`;

const SettingsComponent = styled.ScrollView`
  flex: 1;
  margin-top: 15px;
  padding: 0 ${ScreenGutter};
`;

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
