import React from 'react';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import {useNavigation} from '@react-navigation/native';
import {
  Br,
  Hr,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import AngleRight from '../../../../../../assets/img/angle-right.svg';
import {useTranslation} from 'react-i18next';

const ExternalServicesSettingsRoot: React.FC = () => {
  const navigation = useNavigation();
  const {t} = useTranslation();

  return (
    <SettingsContainer>
      <Settings>
        <SettingTitle>Buy Crypto Services</SettingTitle>
        <Setting
          onPress={() =>
            navigation.navigate('ExternalServicesSettings', {
              screen: 'SimplexSettings',
            })
          }>
          <SettingTitle>{t('Simplex')}</SettingTitle>
          <AngleRight />
        </Setting>
        <Hr />
        <Setting
          onPress={() =>
            navigation.navigate('ExternalServicesSettings', {
              screen: 'WyreSettings',
            })
          }>
          <SettingTitle>{t('Wyre')}</SettingTitle>
          <AngleRight />
        </Setting>
        <Hr />
        <Br />
        <SettingTitle>Swap Crypto Services</SettingTitle>
        <Setting
          onPress={() =>
            navigation.navigate('ExternalServicesSettings', {
              screen: 'ChangellySettings',
            })
          }>
          <SettingTitle>{t('Changelly')}</SettingTitle>
          <AngleRight />
        </Setting>
      </Settings>
    </SettingsContainer>
  );
};

export default ExternalServicesSettingsRoot;
