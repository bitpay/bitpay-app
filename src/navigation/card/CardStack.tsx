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
import CustomizeVirtualCard, {
  CustomizeVirtualCardParamList,
} from './screens/settings/CustomizeVirtualCard';
import UpdateCardNameScreen, {
  UpdateCardNameScreenParamList,
} from './screens/settings/UpdateCardName';
import Referral, {ReferralParamList} from './screens/settings/Referral';
import {HeaderTitle} from '../../components/styled/Text';

export type CardStackParamList = {
  CardHome: CardHomeScreenParamList;
  Pairing: CardPairingScreenParamList;
  Settings: CardSettingsParamList;
  CustomizeVirtualCard: CustomizeVirtualCardParamList;
  UpdateCardName: UpdateCardNameScreenParamList;
  Referral: ReferralParamList;
};

export enum CardScreens {
  HOME = 'CardHome',
  PAIRING = 'Pairing',
  SETTINGS = 'Settings',
  CUSTOMIZE_VIRTUAL_CARD = 'CustomizeVirtualCard',
  UPDATE_CARD_NAME = 'UpdateCardName',
  REFERRAL = 'Referral',
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
          headerTitle: () => <HeaderTitle>Pairing...</HeaderTitle>,
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
      <Card.Screen name={CardScreens.REFERRAL} component={Referral} />
    </Card.Navigator>
  );
};

export default CardStack;
