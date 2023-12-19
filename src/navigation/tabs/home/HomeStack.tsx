import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ZeroHeightHeader} from '../../../components/styled/Text';
import {baseNavigatorOptions} from '../../../constants/NavigationOptions';
import HomeRoot from './HomeRoot';

export type HomeStackParamList = {
  Root: undefined;
};

export enum HomeScreens {
  Root = 'Root',
}

const Home = createNativeStackNavigator<HomeStackParamList>();

const HomeStack = () => {
  return (
    <Home.Navigator
      initialRouteName={HomeScreens.Root}
      screenOptions={{
        ...baseNavigatorOptions,
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
