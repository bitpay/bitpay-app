import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../../constants/NavigationOptions';
import {CardConfig} from '../../../../store/shop/shop.models';
import BuyGiftCard from './screens/BuyGiftCard';

export type GiftCardStackParamList = {
  BuyGiftCard: {cardConfig: CardConfig};
};

export enum GiftCardScreens {
  BUY_GIFT_CARD = 'BuyGiftCard',
}

const GiftCard = createStackNavigator<GiftCardStackParamList>();

const GiftCardStack = () => {
  return (
    <GiftCard.Navigator
      initialRouteName={GiftCardScreens.BUY_GIFT_CARD}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <GiftCard.Screen
        name={GiftCardScreens.BUY_GIFT_CARD}
        component={BuyGiftCard}
      />
    </GiftCard.Navigator>
  );
};

export default GiftCardStack;
