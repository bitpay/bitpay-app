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

export type GiftCardStackParamList = {
  BuyGiftCard: {cardConfig: CardConfig};
  GiftCardDetails: {cardConfig: CardConfig; giftCard: GiftCard};
  ArchivedGiftCards: {giftCards: GiftCard[]; supportedGiftCards: CardConfig[]};
};

export enum GiftCardScreens {
  BUY_GIFT_CARD = 'BuyGiftCard',
  GIFT_CARD_DETAILS = 'GiftCardDetails',
  ARCHIVED_GIFT_CARDS = 'ArchivedGiftCards',
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
        name={GiftCardScreens.BUY_GIFT_CARD}
        component={BuyGiftCard}
      />
      <GiftCards.Screen
        name={GiftCardScreens.GIFT_CARD_DETAILS}
        component={GiftCardDetails}
        options={{
          gestureEnabled: false,
        }}
      />
      <GiftCards.Screen
        name={GiftCardScreens.ARCHIVED_GIFT_CARDS}
        component={ArchivedGiftCards}
        options={{
          gestureEnabled: false,
          headerTitle: 'Archived Gift Cards',
        }}
      />
    </GiftCards.Navigator>
  );
};

export default GiftCardStack;
