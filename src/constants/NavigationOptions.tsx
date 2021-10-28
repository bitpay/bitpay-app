import React from 'react';
import {
  StackNavigationOptions,
  TransitionPresets,
} from '@react-navigation/stack';
import Back from '../components/back/Back';

export const baseNavigatorOptions: StackNavigationOptions = {
  headerBackImage: () => <Back />,
  headerTitle: '',
  headerBackTitleVisible: false,
  headerStyle: {
    backgroundColor: 'transparent',
  },
  headerShadowVisible: false,
};

export const baseScreenOptions: StackNavigationOptions = {
  ...TransitionPresets.SlideFromRightIOS,
};

export const headerRightContainerStyle = {
  paddingHorizontal: 10,
  height: 50,
};
