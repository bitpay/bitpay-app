import BackIcon from '../../assets/img/back.svg';
import React from 'react';
import {StackNavigationOptions} from '@react-navigation/stack';

export const screenOptions: StackNavigationOptions = {
  headerBackImage: () => <BackIcon />,
  headerTitle: '',
  headerStyle: {
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    shadowRadius: 0,
    height: 70,
  },
};
