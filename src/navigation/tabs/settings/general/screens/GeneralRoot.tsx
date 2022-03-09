import React from 'react';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import Button from '../../../../../components/button/Button';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../../store';
import {
  Hr,
  Info,
  InfoTriangle,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import AngleRight from '../../../../../../assets/img/angle-right.svg';
import {useTranslation} from 'react-i18next';
import ToggleSwitch from '../../../../../components/toggle-switch/ToggleSwitch';
import {InfoDescription} from '../../../../../components/styled/Text';

const GeneralSettingsRoot: React.FC = () => {
  const navigation = useNavigation();
  const colorScheme = useSelector(({APP}: RootState) => APP.colorScheme);
  const {t} = useTranslation();

  return (
    <SettingsContainer>
      <Settings>
        <Hr />
        {/*----------------------------------------------------------------------*/}
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
        {/*----------------------------------------------------------------------*/}
        <Setting
          onPress={() =>
            navigation.navigate('GeneralSettings', {screen: 'CustomizeHome'})
          }>
          <SettingTitle>{t('Customize Home')}</SettingTitle>
          <AngleRight />
        </Setting>
        <Hr />
        {/*----------------------------------------------------------------------*/}
        <Setting
          onPress={() =>
            navigation.navigate('GeneralSettings', {screen: 'CustomizeHome'})
          }>
          <SettingTitle>{t('Show Portfolio')}</SettingTitle>
          <ToggleSwitch onChange={() => null} isEnabled={false} />
        </Setting>
        <Hr />
        {/*----------------------------------------------------------------------*/}
        <Setting
          onPress={
            () => null // Todo
          }>
          <SettingTitle>{t('Display Currency')}</SettingTitle>
          <AngleRight />
        </Setting>
        <Hr />
        {/*----------------------------------------------------------------------*/}
        <Setting
          onPress={() =>
            navigation.navigate('GeneralSettings', {screen: 'LanguageSettings'})
          }>
          <SettingTitle>{t('Language')}</SettingTitle>
          <AngleRight />
        </Setting>
        <Hr />
        {/*----------------------------------------------------------------------*/}
        <Setting
          onPress={
            () => null // Todo
          }>
          <SettingTitle>{t('Reset All Settings')}</SettingTitle>
        </Setting>
        <Hr />
        {/*----------------------------------------------------------------------*/}
        <Setting>
          <SettingTitle>{t('Use Unconfirmed Funds')}</SettingTitle>
          <ToggleSwitch onChange={() => null} isEnabled={false} />
        </Setting>
        <Info>
          <InfoTriangle />
          <InfoDescription>
            If enabled, wallets will also try to spend unconfirmed funds.
            However, unconfirmed funds are not allow for spending with
            merchants, BitPay Card loads, or BitPay in-app gift card purchases.
          </InfoDescription>
        </Info>
      </Settings>
    </SettingsContainer>
  );
};

export default GeneralSettingsRoot;
