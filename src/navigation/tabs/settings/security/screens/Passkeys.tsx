import React, {useMemo, useState} from 'react';
import styled from 'styled-components/native';
import {Platform} from 'react-native';
import {SettingsComponent, SettingsContainer} from '../../SettingsRoot';
import {
  Hr,
  ScreenGutter,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import Button from '../../../../../components/button/Button';
import {useTranslation} from 'react-i18next';
import {LogActions} from '../../../../../store/log';
import {Black, Feather, LightBlack, White} from '../../../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';

const ScrollContainer = styled.ScrollView``;

const HeaderTitle = styled(Setting)`
  margin-top: 20px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : Feather)};
  padding: 0 ${ScreenGutter};
  border-bottom-width: 1px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const PasskeyScreen: React.FC = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();

  const createPasskey = () => {
    // Functionality to create a new passkey goes here
  };

  return (
    <SettingsContainer>
      <ScrollContainer>
        <HeaderTitle>
          <SettingTitle>{t('Setup a passkey')}</SettingTitle>
        </HeaderTitle>
        <SettingsComponent>
          <Setting>
            <SettingTitle>
              Passkeys are encrypted digital keys you create using your
              fingerprint, face, or screen lock.
            </SettingTitle>
          </Setting>
        </SettingsComponent>
        <Button buttonType={'link'} onPress={createPasskey}>
          Create a new Passkey
        </Button>
      </ScrollContainer>
    </SettingsContainer>
  );
};

export default PasskeyScreen;
