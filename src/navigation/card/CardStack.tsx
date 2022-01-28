import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import CardHome, {CardHomeScreenParamList} from './screens/CardHome';
import CardSettings, {CardSettingsParamList} from './screens/CardSettings';
import CustomizeVirtualCard, {
  CustomizeVirtualCardParamList,
} from './screens/settings/CustomizeVirtualCard';

export type CardStackParamList = {
  Home: CardHomeScreenParamList;
  Settings: CardSettingsParamList;
  CustomizeVirtualCard: CustomizeVirtualCardParamList;
};

export enum CardScreens {
  HOME = 'Home',
  SETTINGS = 'Settings',
  CUSTOMIZE_VIRTUAL_CARD = 'CustomizeVirtualCard',
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
      <Card.Group navigationKey="card-settings">
        <Card.Screen
          name={CardScreens.CUSTOMIZE_VIRTUAL_CARD}
          component={CustomizeVirtualCard}
        />
      </Card.Group>
    </Card.Navigator>
  );
};

export default CardStack;
