import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../../components/styled/Text';
import AboutRoot from './screens/AboutRoot';

export type AboutStackParamList = {
  Root: undefined;
};

export enum AboutScreens {
  ROOT = 'Root',
}

const About = createStackNavigator<AboutStackParamList>();

const AboutStack = () => {
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
          headerTitle: () => <HeaderTitle>About BitPay</HeaderTitle>,
        }}
      />
    </About.Navigator>
  );
};

export default AboutStack;
