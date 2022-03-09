import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import Scan from './screens/Scan';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';

export enum ScanScreens {
  Root = 'Root',
}

export type ScanStackParamList = {
  Root: {onScanComplete?: (data: string) => void} | undefined;
};

const ScanNavigator = createStackNavigator<ScanStackParamList>();

const ScanStack = () => {
  return (
    <ScanNavigator.Navigator
      initialRouteName={ScanScreens.Root}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
        headerTransparent: true,
      }}>
      <ScanNavigator.Screen name={ScanScreens.Root} component={Scan} />
    </ScanNavigator.Navigator>
  );
};

export default ScanStack;
