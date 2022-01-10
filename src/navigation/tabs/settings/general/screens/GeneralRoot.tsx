import React from 'react';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import Button from '../../../../../components/button/Button';
import {useNavigation, useTheme} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../../store';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import AngleRight from '../../../../../../assets/img/angle-right.svg';
import {StyleProp, TextStyle} from 'react-native';
import {useTranslation} from 'react-i18next';

const GeneralSettingsRoot: React.FC = () => {
  const navigation = useNavigation();
  const colorScheme = useSelector(({APP}: RootState) => APP.colorScheme);
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};
  const {t} = useTranslation();

  return (
    <SettingsContainer>
      <Settings>
        <Hr />
        <Setting
          onPress={() =>
            navigation.navigate('GeneralSettings', {screen: 'LanguageSettings'})
          }>
          <SettingTitle style={textStyle}>{t('Language')}</SettingTitle>
          <AngleRight />
        </Setting>
        <Hr isDark={theme.dark} />
        <Setting
          onPress={() =>
            navigation.navigate('GeneralSettings', {screen: 'Theme'})
          }>
          <SettingTitle style={textStyle}>{t('Theme')}</SettingTitle>
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
          <SettingTitle style={textStyle}>{t('Customize Home')}</SettingTitle>
          <AngleRight />
        </Setting>
        <Hr />
      </Settings>
    </SettingsContainer>
  );
};

export default GeneralSettingsRoot;
