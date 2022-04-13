import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../../components/styled/Text';
import ConnectionsRoot from './screens/ConnectionsRoot';

import {useTranslation} from 'react-i18next';

export type ConnectionsSettingsStackParamList = {
  Root: {redirectTo: string} | undefined;
};

export enum ConnectionSettingsScreens {
  ROOT = 'Root',
}

const ConnectionSettings =
  createStackNavigator<ConnectionsSettingsStackParamList>();

const ConnectionsSettingsStack = () => {
  const {t} = useTranslation();
  return (
    <ConnectionSettings.Navigator
      initialRouteName={ConnectionSettingsScreens.ROOT}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <ConnectionSettings.Screen
        name={ConnectionSettingsScreens.ROOT}
        component={ConnectionsRoot}
        options={{
          headerTitle: () => <HeaderTitle>{t('Connections')}</HeaderTitle>,
        }}
      />
    </ConnectionSettings.Navigator>
  );
};

export default ConnectionsSettingsStack;
