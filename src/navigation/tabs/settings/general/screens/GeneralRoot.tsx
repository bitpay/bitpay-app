import React from 'react';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import Button from '../../../../../components/button/Button';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../../store';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import AngleRight from '../../../../../../assets/img/angle-right.svg';
import {useTranslation} from 'react-i18next';

const GeneralSettingsRoot: React.FC = () => {
  const navigation = useNavigation();
  const colorScheme = useSelector(({APP}: RootState) => APP.colorScheme);
  const {t} = useTranslation();

  return (
    <SettingsContainer>
      <Settings>
        <Hr />
        <Setting
          onPress={() =>
            navigation.navigate('GeneralSettings', {screen: 'LanguageSettings'})
          }>
          <SettingTitle>{t('Language')}</SettingTitle>
          <AngleRight />
        </Setting>
        <Hr />
        <Setting
          onPress={() =>
            navigation.navigate('GeneralSettings', {screen: 'Theme'})
          }>
          <SettingTitle>{t('Theme')}</SettingTitle>
          <Button
            buttonType={'pill'}
            onPress={() =>
              navigation.navigate('GeneralSettings', {screen: 'Theme'})
            }>
            {colorScheme === 'light'
              ? 'Light Mode'
              : colorScheme === 'dark'
              ? 'Dark Mode'
              : 'System Default'}
          </Button>
        </Setting>
        <Hr />
        <Setting
          onPress={() =>
            navigation.navigate('GeneralSettings', {screen: 'CustomizeHome'})
          }>
          <SettingTitle>{t('Customize Home')}</SettingTitle>
          <AngleRight />
        </Setting>
        <Hr />
      </Settings>
    </SettingsContainer>
  );
};

export default GeneralSettingsRoot;
