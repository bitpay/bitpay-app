import React from 'react';
import {HeaderTitle} from '../../../../components/styled/Text';
import Theme from './screens/Theme';
import CustomizeHomeSettings from './screens/customize-home/CustomizeHome';
import AltCurrencySettings from './screens/AltCurrencySettings';
import LanguageSettings from './screens/LanguageSettings';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderBackButton} from '@react-navigation/elements';
import {useTranslation} from 'react-i18next';
import {Root} from '../../../../Root';

interface GeneralSettingsProps {
  GeneralSettings: typeof Root;
}

export type GeneralSettingsGroupParamList = {
  LanguageSettings: undefined;
  Theme: undefined;
  CustomizeHomeSettings: undefined;
  AltCurrencySettings: undefined;
};

export enum GeneralSettingsScreens {
  LANGUAGE_SETTINGS = 'LanguageSettings',
  THEME = 'Theme',
  CUSTOMIZE_HOME = 'CustomizeHomeSettings',
  ALT_CURRENCY_SETTTINGS = 'AltCurrencySettings',
}

const GeneralSettingsGroup: React.FC<GeneralSettingsProps> = ({
  GeneralSettings,
}) => {
  const {t} = useTranslation();
  return (
    <GeneralSettings.Group
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
      <GeneralSettings.Screen
        name={GeneralSettingsScreens.THEME}
        component={Theme}
      />
      <GeneralSettings.Screen
        name={GeneralSettingsScreens.CUSTOMIZE_HOME}
        component={CustomizeHomeSettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Customize Home')}</HeaderTitle>,
        }}
      />
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
    </GeneralSettings.Group>
  );
};

export default GeneralSettingsGroup;
