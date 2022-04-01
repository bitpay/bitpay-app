import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../../components/styled/Text';
import GeneralRoot from './screens/GeneralRoot';
import Theme from './screens/Theme';
import CustomizeHome from './screens/customize-home/CustomizeHome';
import LanguageSettings from './screens/LanguageSettings';

import {useTranslation} from 'react-i18next';

export type GeneralSettingsStackParamList = {
  Root: undefined;
  LanguageSettings: undefined;
  Theme: undefined;
  CustomizeHome: undefined;
};

export enum GeneralSettingsScreens {
  ROOT = 'Root',
  LANGUAGE_SETTINGS = 'LanguageSettings',
  THEME = 'Theme',
  CUSTOMIZE_HOME = 'CustomizeHome',
}

const GeneralSettings = createStackNavigator<GeneralSettingsStackParamList>();

const GeneralSettingsStack = () => {
  const {t} = useTranslation();
  return (
    <GeneralSettings.Navigator
      initialRouteName={GeneralSettingsScreens.ROOT}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <GeneralSettings.Screen
        name={GeneralSettingsScreens.ROOT}
        component={GeneralRoot}
        options={{
          headerTitle: () => <HeaderTitle>{t('General')}</HeaderTitle>,
        }}
      />
      <GeneralSettings.Screen
        name={GeneralSettingsScreens.THEME}
        component={Theme}
        options={{
          headerTitle: () => <HeaderTitle>{t('Theme')}</HeaderTitle>,
        }}
      />
      <GeneralSettings.Screen
        name={GeneralSettingsScreens.CUSTOMIZE_HOME}
        component={CustomizeHome}
        options={{
          headerTitle: () => <HeaderTitle>{t('Customize Home')}</HeaderTitle>,
        }}
      />
      <GeneralSettings.Screen
        name={GeneralSettingsScreens.LANGUAGE_SETTINGS}
        component={LanguageSettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Language')}</HeaderTitle>,
        }}
      />
    </GeneralSettings.Navigator>
  );
};

export default GeneralSettingsStack;
