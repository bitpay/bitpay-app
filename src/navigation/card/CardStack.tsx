import React from 'react';
import {useTranslation} from 'react-i18next';
import {createSharedElementStackNavigator} from 'react-navigation-shared-element';
import {oldBaseNavigatorOptions} from '../../constants/NavigationOptions';
import CardHome, {CardHomeScreenParamList} from './screens/CardHome';
import CardPairingScreen, {
  CardPairingScreenParamList,
} from './screens/CardPairingScreen';
import CardSettings, {CardSettingsParamList} from './screens/CardSettings';
import CustomizeVirtualCard, {
  CustomizeVirtualCardParamList,
} from './screens/settings/CustomizeVirtualCard';
import UpdateCardNameScreen, {
  UpdateCardNameScreenParamList,
} from './screens/settings/UpdateCardName';
import {HeaderTitle} from '../../components/styled/Text';
import ResetPinScreen, {
  ResetPinScreenParamList,
} from './screens/settings/ResetPinScreen';

export type CardStackParamList = {
  CardHome: CardHomeScreenParamList;
  CardPairingScreen: CardPairingScreenParamList;
  Settings: CardSettingsParamList;
  CustomizeVirtualCard: CustomizeVirtualCardParamList;
  UpdateCardName: UpdateCardNameScreenParamList;
  CardResetPin: ResetPinScreenParamList;
};

export enum CardScreens {
  HOME = 'CardHome',
  PAIRING = 'CardPairingScreen',
  SETTINGS = 'Settings',
  CUSTOMIZE_VIRTUAL_CARD = 'CustomizeVirtualCard',
  UPDATE_CARD_NAME = 'UpdateCardName',
  RESET_PIN = 'CardResetPin',
}

const Card = createSharedElementStackNavigator<CardStackParamList>();

const CardStack = () => {
  const {t} = useTranslation();

  return (
    <Card.Navigator
      initialRouteName={CardScreens.HOME}
      screenOptions={{
        ...oldBaseNavigatorOptions,
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
      <Card.Screen
        name={CardScreens.CUSTOMIZE_VIRTUAL_CARD}
        component={CustomizeVirtualCard}
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Customize Virtual Card')}</HeaderTitle>
          ),
        }}
      />
      <Card.Screen
        name={CardScreens.UPDATE_CARD_NAME}
        component={UpdateCardNameScreen}
        options={{
          headerTitle: () => <HeaderTitle>{t('Update Card Name')}</HeaderTitle>,
        }}
      />
      <Card.Screen
        name={CardScreens.RESET_PIN}
        component={ResetPinScreen}
        options={{
          headerTitle: () => <HeaderTitle>{t('Reset PIN')}</HeaderTitle>,
        }}
      />
    </Card.Navigator>
  );
};

export default CardStack;
