import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import {HeaderTitle} from '../../components/styled/Text';
import {t} from 'i18next';
import {CardConfigMap, GiftCard} from '../../store/shop/shop.models';
import ArchivedGiftCards from '../tabs/shop/gift-card/screens/ArchivedGiftCards';

export type ShopStackParamList = {
  ArchivedGiftCards: {
    giftCards: GiftCard[];
    supportedGiftCardMap: CardConfigMap;
  };
};

export enum ShopScreens {
  ARCHIVED_GIFT_CARDS = 'ArchivedGiftCards',
}

const Shop = createStackNavigator<ShopStackParamList>();

const ShopStack = () => {
  return (
    <Shop.Navigator
      initialRouteName={ShopScreens.ARCHIVED_GIFT_CARDS}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
        gestureEnabled: false,
      }}>
      <Shop.Screen
        name={ShopScreens.ARCHIVED_GIFT_CARDS}
        component={ArchivedGiftCards}
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Archived Gift Cards')}</HeaderTitle>
          ),
        }}
      />
    </Shop.Navigator>
  );
};

export default ShopStack;
