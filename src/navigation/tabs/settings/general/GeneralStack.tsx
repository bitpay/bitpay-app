import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../../components/styled/Text';
import Theme from './screens/Theme';
import CustomizeHome from './screens/customize-home/CustomizeHome';
import AltCurrencySettings from './screens/AltCurrencySettings';
import LanguageSettings from './screens/LanguageSettings';

import {useTranslation} from 'react-i18next';

export type GeneralSettingsStackParamList = {
  LanguageSettings: undefined;
  Theme: undefined;
  CustomizeHome: undefined;
  AltCurrencySettings: undefined;
};

export enum GeneralSettingsScreens {
  LANGUAGE_SETTINGS = 'LanguageSettings',
  THEME = 'Theme',
  CUSTOMIZE_HOME = 'CustomizeHome',
  ALT_CURRENCY_SETTTINGS = 'AltCurrencySettings',
}

const GeneralSettings = createStackNavigator<GeneralSettingsStackParamList>();

const GeneralSettingsStack = () => {
  const {t} = useTranslation();
  return (
    <GeneralSettings.Navigator
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <GeneralSettings.Screen
        name={GeneralSettingsScreens.THEME}
        component={Theme}
      />
      {/*<GeneralSettings.Screen
        name={GeneralSettingsScreens.CUSTOMIZE_HOME}
        component={CustomizeHome}
        options={{
          headerTitle: () => <HeaderTitle>{t('Customize Home')}</HeaderTitle>,
        }}
      />*/}
     <GeneralSettings.Screen
        name={GeneralSettingsScreens.ALT_CURRENCY_SETTTINGS}
        component={AltCurrencySettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Display Currency')}</HeaderTitle>,
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
