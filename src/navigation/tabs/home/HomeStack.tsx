import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../constants/NavigationOptions';
import HomeRoot from './HomeRoot';
import {View} from 'react-native';

export type HomeStackParamList = {
  Root: undefined;
};

export enum HomeScreens {
  Root = 'Root',
}

const Home = createStackNavigator<HomeStackParamList>();

const HomeStack = () => {
  return (
    <Home.Navigator
      initialRouteName={HomeScreens.Root}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <Home.Screen
        name={HomeScreens.Root}
        component={HomeRoot}
        options={{
          headerLeft: () => null,
          headerTitle: () => null,
          // TODO: Add scanner and profile
          headerRight: () => <View />,
        }}
      />
    </Home.Navigator>
  );
};

export default HomeStack;
