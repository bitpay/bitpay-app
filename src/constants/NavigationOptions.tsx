import React from 'react';
import Back from '../components/back/Back';
import {WIDTH} from '../components/styled/Containers';
import {StackNavigationOptions} from '@react-navigation/stack';

export const baseNavigatorOptions: StackNavigationOptions = {
  headerBackImage: () => <Back opacity={1} />,
  headerShown: true,
  headerTitle: '',
  headerTitleAlign: 'center',
  headerStyle: {
    backgroundColor: 'transparent',
  },
  headerShadowVisible: false,
  headerTitleStyle: {maxWidth: WIDTH - 150},
};
