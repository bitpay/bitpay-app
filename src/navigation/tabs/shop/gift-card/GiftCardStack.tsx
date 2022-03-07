import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../../constants/NavigationOptions';
import {CardConfig, GiftCard} from '../../../../store/shop/shop.models';
import BuyGiftCard from './screens/BuyGiftCard';
import GiftCardDetails from './screens/GiftCardDetails';
import ArchivedGiftCards from './screens/ArchivedGiftCards';
import EnterPhone from './screens/EnterPhone';
import EnterEmail from './screens/EnterEmail';
import {HeaderTitle} from '../../../../components/styled/Text';

export type GiftCardStackParamList = {
  ArchivedGiftCards: {giftCards: GiftCard[]; supportedGiftCards: CardConfig[]};
  BuyGiftCard: {cardConfig: CardConfig};
  EnterEmail: {cardConfig: CardConfig};
  EnterPhone: {cardConfig: CardConfig};
  GiftCardDetails: {cardConfig: CardConfig; giftCard: GiftCard};
};

export enum GiftCardScreens {
  ARCHIVED_GIFT_CARDS = 'ArchivedGiftCards',
  BUY_GIFT_CARD = 'BuyGiftCard',
  ENTER_EMAIL = 'EnterEmail',
  ENTER_PHONE = 'EnterPhone',
  GIFT_CARD_DETAILS = 'GiftCardDetails',
}

const GiftCards = createStackNavigator<GiftCardStackParamList>();

const GiftCardStack = () => {
  return (
    <GiftCards.Navigator
      initialRouteName={GiftCardScreens.BUY_GIFT_CARD}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <GiftCards.Screen
        name={GiftCardScreens.ARCHIVED_GIFT_CARDS}
        component={ArchivedGiftCards}
        options={{
          gestureEnabled: false,
          headerTitle: 'Archived Gift Cards',
        }}
      />
      <GiftCards.Screen
        name={GiftCardScreens.BUY_GIFT_CARD}
        component={BuyGiftCard}
      />
      <GiftCards.Screen
        name={GiftCardScreens.ENTER_EMAIL}
        component={EnterEmail}
        options={{
          headerTitle: () => (
            <HeaderTitle>Enter your email address</HeaderTitle>
          ),
        }}
      />
      <GiftCards.Screen
        name={GiftCardScreens.ENTER_PHONE}
        component={EnterPhone}
        options={{
          headerTitle: () => <HeaderTitle>Enter your phone number</HeaderTitle>,
        }}
      />
      <GiftCards.Screen
        name={GiftCardScreens.GIFT_CARD_DETAILS}
        component={GiftCardDetails}
        options={{
          gestureEnabled: false,
        }}
      />
    </GiftCards.Navigator>
  );
};

export default GiftCardStack;
