import React from 'react';
import {useTranslation} from 'react-i18next';
import {createSharedElementStackNavigator} from 'react-navigation-shared-element';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import CardHome, {CardHomeScreenParamList} from './screens/CardHome';
import CardPairingScreen, {
  CardPairingScreenParamList,
} from './screens/CardPairingScreen';
import CardSettings, {CardSettingsParamList} from './screens/CardSettings';
import {HeaderTitle} from '../../components/styled/Text';

export type CardStackParamList = {
  CardHome: CardHomeScreenParamList;
  CardPairingScreen: CardPairingScreenParamList;
  Settings: CardSettingsParamList;
};

export enum CardScreens {
  HOME = 'CardHome',
  PAIRING = 'CardPairingScreen',
  SETTINGS = 'Settings',
}

const Card = createSharedElementStackNavigator<CardStackParamList>();

const CardStack = () => {
  const {t} = useTranslation();

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
          headerLeft: () => null,
          headerTitle: () => <HeaderTitle>{t('Card')}</HeaderTitle>,
        }}
        sharedElements={route => {
          return [
            {
              id: 'card.dashboard.active-card.' + route.params.id,
              animation: 'fade',
            },
          ];
        }}
      />
      <Card.Screen
        name={CardScreens.PAIRING}
        component={CardPairingScreen}
        options={{
          headerTitle: () => <HeaderTitle>{t('Pairing...')}</HeaderTitle>,
        }}
      />
      <Card.Screen
        name={CardScreens.SETTINGS}
        component={CardSettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Card Details')}</HeaderTitle>,
          title: 'Settings',
        }}
      />
    </Card.Navigator>
  );
};

export default CardStack;
