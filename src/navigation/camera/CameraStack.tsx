import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import QRScan from './screens/QRScan';

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
      <CameraNavigator.Screen name={CameraScreens.Root} component={QRScan} />
    </CameraNavigator.Navigator>
  );
};

export default CameraStack;
