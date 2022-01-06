import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../constants/NavigationOptions';
import CardHome, {CardHomeScreenParamList} from './screens/CardHome';
import CardSettings, {CardSettingsParamList} from './screens/CardSettings';

export type CardStackParamList = {
  Home: CardHomeScreenParamList;
  Settings: CardSettingsParamList;
};

export enum CardScreens {
  HOME = 'Home',
  SETTINGS = 'Settings',
}

const Card = createStackNavigator<CardStackParamList>();

const CardStack = () => {
  return (
    <Card.Navigator
      initialRouteName={CardScreens.HOME}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <Card.Screen
        name={CardScreens.HOME}
        component={CardHome}
        options={{
          title: 'Card',
        }}
      />
      <Card.Screen
        name={CardScreens.SETTINGS}
        component={CardSettings}
        options={{
          title: 'Settings',
        }}
      />
    </Card.Navigator>
  );
};

export default CardStack;
