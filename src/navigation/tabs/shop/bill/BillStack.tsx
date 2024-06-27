import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {baseNavigatorOptions} from '../../../../constants/NavigationOptions';
import BillsHome from './screens/BillsHome';
import {useTheme} from 'styled-components/native';

export type BillStackParamList = {
  BillsHome: {};
};

export enum BillScreens {
  BILLS_HOME = 'BillsHome',
}

const Bill = createNativeStackNavigator<BillStackParamList>();

const BillStack = () => {
  const theme = useTheme();
  return (
    <Bill.Navigator
      initialRouteName={BillScreens.BILLS_HOME}
      screenOptions={() => ({
        ...baseNavigatorOptions,
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
      })}>
      <Bill.Screen
        name={BillScreens.BILLS_HOME}
        component={BillsHome}
        options={{
          headerShown: false,
        }}
      />
    </Bill.Navigator>
  );
};

export default BillStack;
