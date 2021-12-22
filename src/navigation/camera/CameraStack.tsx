import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import {createStackNavigator} from '@react-navigation/stack';
import Camera from './screens/Camera';

export enum CameraScreens {
  Root = 'Root',
}

export type CameraStackParamList = {
  Root: undefined;
};

const CameraNavigator = createStackNavigator<CameraStackParamList>();

const CameraStack = () => {
  return (
    <CameraNavigator.Navigator
      screenOptions={{...baseNavigatorOptions, ...baseScreenOptions}}
      initialRouteName={CameraScreens.Root}>
      <CameraNavigator.Screen
        options={{
          gestureEnabled: false,
        }}
        name={CameraScreens.Root}
        component={Camera}
      />
    </CameraNavigator.Navigator>
  );
};

export default CameraStack;
