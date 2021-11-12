import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { baseNavigatorOptions, baseScreenOptions } from '../../../constants/NavigationOptions';
import CardHome from './CardHome';

export type CardStackParamList = {
  Home: undefined;
};

export enum CardScreens {
  HOME = 'Home',
}

const Card = createStackNavigator<CardStackParamList>();

const CardStack = () => {
  return (
    <Card.Navigator
      initialRouteName={CardScreens.HOME}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions
      }}>
        <Card.Screen
        name={CardScreens.HOME}
        component={CardHome}
        options={{
          title: 'Card'
        }} />
    </Card.Navigator>
  );
};

export default CardStack;
