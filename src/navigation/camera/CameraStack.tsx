import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import {createStackNavigator} from '@react-navigation/stack';
import Camera from './screens/Camera';

export enum CameraScreens {
  CAMERA = 'Camera',
}

export type CameraStackParamList = {
  Camera: undefined;
};

const CameraNavigator = createStackNavigator<CameraStackParamList>();

const CameraStack = () => {
  return (
    <CameraNavigator.Navigator
      screenOptions={{...baseNavigatorOptions, ...baseScreenOptions}}
      initialRouteName={CameraScreens.CAMERA}>
      <CameraNavigator.Screen
        options={{
          gestureEnabled: false,
        }}
        name={CameraScreens.CAMERA}
        component={Camera}
      />
    </CameraNavigator.Navigator>
  );
};

export default CameraStack;
