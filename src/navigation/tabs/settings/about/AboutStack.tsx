import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../../components/styled/Text';
import AboutRoot from './screens/AboutRoot';

import {useTranslation} from 'react-i18next';

export type AboutStackParamList = {
  Root: undefined;
};

export enum AboutScreens {
  ROOT = 'Root',
}

const About = createStackNavigator<AboutStackParamList>();

const AboutStack = () => {
  const {t} = useTranslation();
  return (
    <About.Navigator
      initialRouteName={AboutScreens.ROOT}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <About.Screen
        name={AboutScreens.ROOT}
        component={AboutRoot}
        options={{
          headerTitle: () => <HeaderTitle>{t('About BitPay')}</HeaderTitle>,
        }}
      />
    </About.Navigator>
  );
};

export default AboutStack;
