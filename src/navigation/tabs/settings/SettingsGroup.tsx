import React from 'react';
import {HeaderTitle} from '../../../components/styled/Text';
import {useTranslation} from 'react-i18next';
import {Root} from '../../../Root';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../../constants/NavigationOptions';
import SettingsHome, {SettingsHomeProps} from './SettingsRoot';
import SettingsDetails, {SettingsDetailsParamList} from './SettingsDetails';
import {HeaderBackButton} from '@react-navigation/elements';

interface SettingsProps {
  Settings: typeof Root;
}

export type SettingsGroupParamList = {
  SettingsHome: {
    redirectTo?: string;
  };
  SettingsDetails: {
    initialRoute?: keyof SettingsDetailsParamList;
    redirectTo?: string;
  };
} & SettingsDetailsParamList;

export enum SettingsScreens {
  SETTINGS_HOME = 'SettingsHome',
  SETTINGS_DETAILS = 'SettingsDetails',
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
          animation: 'slide_from_bottom',
          headerTitle: () => <HeaderTitle>{t('Settings')}</HeaderTitle>,
        }}
      />
      <Settings.Screen
        name={SettingsScreens.SETTINGS_DETAILS}
        component={SettingsDetails}
        options={{
          // animation: 'slide_from_right',
          headerShown: false,
        }}
      />
    </Settings.Group>
  );
};

export default SettingsGroup;
