import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../constants/NavigationOptions';
import SettingsRoot, {SettingsHomeParamList} from './SettingsRoot';
import {HeaderTitle} from '../../../components/styled/Text';

import {useTranslation} from 'react-i18next';

export type SettingsStackParamList = {
  Root: SettingsHomeParamList | undefined;
};

export enum SettingsScreens {
  Root = 'Root',
}

const Settings = createStackNavigator<SettingsStackParamList>();

const SettingsStack = () => {
  const {t} = useTranslation();
  return (
    <Settings.Navigator
      initialRouteName={SettingsScreens.Root}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <Settings.Screen
        name={SettingsScreens.Root}
        component={SettingsRoot}
        options={{
          headerLeft: () => null,
          headerTitle: () => <HeaderTitle>{t('Settings')}</HeaderTitle>,
        }}
      />
    </Settings.Navigator>
  );
};

export default SettingsStack;
