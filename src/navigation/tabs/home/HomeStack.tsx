import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {ZeroHeightHeader} from '../../../components/styled/Text';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../constants/NavigationOptions';
import HomeRoot from './HomeRoot';

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
          header: () => <ZeroHeightHeader />,
        }}
      />
    </Home.Navigator>
  );
};

export default HomeStack;
