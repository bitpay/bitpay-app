import React from 'react';
import {NativeStackNavigationOptions} from '@react-navigation/native-stack';
import Back from '../components/back/Back';
import {Platform} from 'react-native';
import {WIDTH} from '../components/styled/Containers';
import {StackNavigationOptions} from '@react-navigation/stack';

export const baseNavigatorOptions: NativeStackNavigationOptions = {
  headerTitle: '',
  headerBackTitleVisible: false,
  headerTitleAlign: 'center',
  headerShown: true,
  headerTransparent: Platform.OS === 'ios',
  headerShadowVisible: false,
  headerBackButtonMenuEnabled: false,
  headerBackVisible: false,
  animation: 'default',
};

export const oldBaseNavigatorOptions: StackNavigationOptions = {
  headerBackImage: () => <Back opacity={1} stackNavigation={true} />,
  headerTitle: '',
  headerBackTitleVisible: false,
  headerTitleAlign: 'center',
  headerStyle: {
    backgroundColor: 'transparent',
  },
  headerShadowVisible: false,
  headerTitleStyle: {maxWidth: WIDTH - 150},
};
