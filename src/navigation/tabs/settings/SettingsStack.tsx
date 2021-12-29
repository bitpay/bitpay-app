import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../constants/NavigationOptions';
import SettingsRoot from './SettingsRoot';
import {HeaderTitle} from '../../../components/styled/Text';
import {useTheme} from '@react-navigation/native';
import {StyleProp, TextStyle} from 'react-native';

export type SettingsStackParamList = {
  Root: undefined;
};

export enum SettingsScreens {
  Root = 'Root',
}

const Settings = createStackNavigator<SettingsStackParamList>();

const SettingsStack = () => {
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};

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
          headerTitle: () => (
            <HeaderTitle style={textStyle}>Settings</HeaderTitle>
          ),
        }}
      />
    </Settings.Navigator>
  );
};

export default SettingsStack;
