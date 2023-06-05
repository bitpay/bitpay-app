import React from 'react';
import {
  StackNavigationOptions,
  TransitionPresets,
} from '@react-navigation/stack';
import Back from '../components/back/Back';
import {WIDTH} from '../components/styled/Containers';

export const baseNavigatorOptions: StackNavigationOptions = {
  headerBackImage: () => <Back opacity={1} />,
  headerTitle: '',
  headerBackTitleVisible: false,
  headerTitleAlign: 'center',
  headerStyle: {
    backgroundColor: 'transparent',
  },
  headerShadowVisible: false,
  headerTitleStyle: {maxWidth: WIDTH - 150},
};

export const baseScreenOptions: StackNavigationOptions = {
  ...TransitionPresets.DefaultTransition,
};
