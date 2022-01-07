import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../../components/styled/Text';
import GeneralRoot from './screens/GeneralRoot';
import Theme from './screens/Theme';
import CustomizeHome from './screens/CustomizeHome';

export type GeneralSettingsStackParamList = {
  Root: undefined;
  Theme: undefined;
  CustomizeHome: undefined;
};

export enum GeneralSettingsScreens {
  ROOT = 'Root',
  THEME = 'Theme',
  CUSTOMIZE_HOME = 'CustomizeHome',
}

const GeneralSettings = createStackNavigator<GeneralSettingsStackParamList>();

const GeneralSettingsStack = () => {
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
          headerTitle: () => <HeaderTitle>General</HeaderTitle>,
        }}
      />
      <GeneralSettings.Screen
        name={GeneralSettingsScreens.THEME}
        component={Theme}
        options={{
          headerTitle: () => <HeaderTitle>Theme</HeaderTitle>,
        }}
      />
      <GeneralSettings.Screen
        name={GeneralSettingsScreens.CUSTOMIZE_HOME}
        component={CustomizeHome}
        options={{
          headerTitle: () => <HeaderTitle>Customize Home</HeaderTitle>,
        }}
      />
    </GeneralSettings.Navigator>
  );
};

export default GeneralSettingsStack;
