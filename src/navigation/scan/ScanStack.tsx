import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Scan from './screens/Scan';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../constants/NavigationOptions';
import {HeaderBackButton} from '@react-navigation/elements';

export enum ScanScreens {
  Root = 'Root',
}

export type ScanStackParamList = {
  Root: {onScanComplete?: (data: string) => void} | undefined;
};

const ScanNavigator = createNativeStackNavigator<ScanStackParamList>();

const ScanStack = () => {
  return (
    <ScanNavigator.Navigator
      initialRouteName={ScanScreens.Root}
      screenOptions={({navigation}) => ({
        ...baseNavigatorOptions,
        headerLeft: () => (
          <HeaderBackButton
            onPress={() => {
              navigation.goBack();
            }}
            {...baseNativeHeaderBackButtonProps}
          />
        ),
      })}>
      <ScanNavigator.Screen name={ScanScreens.Root} component={Scan} />
    </ScanNavigator.Navigator>
  );
};

export default ScanStack;
