import React from 'react';
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
    <CameraNavigator.Navigator screenOptions={{headerShown: false}}>
      <CameraNavigator.Screen name={CameraScreens.Root} component={Camera} />
    </CameraNavigator.Navigator>
  );
};

export default CameraStack;
