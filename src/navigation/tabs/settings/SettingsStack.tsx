import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../../constants/NavigationOptions';
import SettingsRoot, {SettingsHomeParamList} from './SettingsRoot';
import {HeaderTitle} from '../../../components/styled/Text';

import {useTranslation} from 'react-i18next';
import {HeaderBackButton} from '@react-navigation/elements';

export type SettingsStackParamList = {
  Root: SettingsHomeParamList | undefined;
};

export enum SettingsScreens {
  Root = 'Root',
}

const Settings = createNativeStackNavigator<SettingsStackParamList>();

const SettingsStack = () => {
  const {t} = useTranslation();
  return (
    <Settings.Navigator
      initialRouteName={SettingsScreens.Root}
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
