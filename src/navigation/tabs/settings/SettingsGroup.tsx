import React from 'react';
import {HeaderTitle} from '../../../components/styled/Text';
import {useTranslation} from 'react-i18next';
import {Root} from '../../../Root';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../../constants/NavigationOptions';
import SettingsHome, {SettingsHomeParamList} from './SettingsRoot';
import {HeaderBackButton} from '@react-navigation/elements';

interface SettingsProps {
  Settings: typeof Root;
}

export type SettingsGroupParamList = {
  SettingsHome: SettingsHomeParamList;
};

export enum SettingsScreens {
  SETTINGS_HOME = 'SettingsHome',
}

const SettingsGroup: React.FC<SettingsProps> = ({Settings}) => {
  const {t} = useTranslation();

  return (
    <Settings.Group
      screenOptions={({navigation}) => ({
        ...baseNavigatorOptions,
        headerLeft: () => (
          <HeaderBackButton
            onPress={() => {
              navigation.goBack();
            }}
            {...baseNativeHeaderBackButtonProps}
          />
        ),
      })}>
      <Settings.Screen
        name={SettingsScreens.SETTINGS_HOME}
        component={SettingsHome}
        options={{
          animation: 'slide_from_left',
          headerTitle: () => <HeaderTitle>{t('Settings')}</HeaderTitle>,
        }}
      />
    </Settings.Group>
  );
};

export default SettingsGroup;
