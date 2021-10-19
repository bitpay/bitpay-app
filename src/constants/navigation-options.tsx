import React from 'react';
import {StackNavigationOptions} from '@react-navigation/stack';
import Back from '../components/back/Back';

export const screenOptions: StackNavigationOptions = {
  headerBackImage: () => <Back />,
  headerTitle: '',
  headerBackTitleVisible: false,
  headerStyle: {
    backgroundColor: 'transparent',
  },
  headerShadowVisible: false,
};
