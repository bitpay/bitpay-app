import React from 'react';
import {useTranslation} from 'react-i18next';
import {createSharedElementStackNavigator} from 'react-navigation-shared-element';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import CardHome, {CardHomeScreenParamList} from './screens/CardHome';
import CardSettings, {CardSettingsParamList} from './screens/CardSettings';
import CustomizeVirtualCard, {
  CustomizeVirtualCardParamList,
} from './screens/settings/CustomizeVirtualCard';
import UpdateCardNameScreen, {
  UpdateCardNameScreenParamList,
} from './screens/settings/UpdateCardName';
import Referral, {ReferralParamList} from './screens/settings/Referral';

export type CardStackParamList = {
  Home: CardHomeScreenParamList;
  Settings: CardSettingsParamList;
  CustomizeVirtualCard: CustomizeVirtualCardParamList;
  UpdateCardName: UpdateCardNameScreenParamList;
  Referral: ReferralParamList;
};

export enum CardScreens {
  HOME = 'Home',
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
        sharedElements={() => {
          return [
            {
              id: 'card.dashboard.active-card',
              animation: 'fade',
            },
          ];
        }}
      />
      <Card.Screen
        name={CardScreens.SETTINGS}
        component={CardSettings}
        options={{
          headerTitle: t('Card Details'),
          title: 'Settings',
        }}
      />
      <Card.Screen
        name={CardScreens.CUSTOMIZE_VIRTUAL_CARD}
        component={CustomizeVirtualCard}
        options={{
          headerTitle: t('Customize Virtual Card'),
        }}
      />
      <Card.Screen
        name={CardScreens.UPDATE_CARD_NAME}
        component={UpdateCardNameScreen}
        options={{
          headerTitle: t('Update Card Name'),
        }}
      />
      <Card.Screen
        name={CardScreens.REFERRAL}
        component={Referral}
        options={{}}
      />
    </Card.Navigator>
  );
};

export default CardStack;
