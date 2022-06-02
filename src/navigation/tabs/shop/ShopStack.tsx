import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../constants/NavigationOptions';
import ShopHome, {ShopHomeParamList} from './ShopHome';
import {HeaderTitle} from '../../../components/styled/Text';
import {t} from 'i18next';
import {NavigatorScreenParams} from '@react-navigation/native';
import {CardConfig, GiftCard} from '../../../store/shop/shop.models';
import ArchivedGiftCards from './gift-card/screens/ArchivedGiftCards';

export type ShopStackParamList = {
  Home: NavigatorScreenParams<ShopHomeParamList>;
  ArchivedGiftCards: {giftCards: GiftCard[]; supportedGiftCards: CardConfig[]};
};

export enum ShopScreens {
  HOME = 'Home',
  ARCHIVED_GIFT_CARDS = 'ArchivedGiftCards',
}

const Shop = createStackNavigator<ShopStackParamList>();

const ShopStack = () => {
  return (
    <Shop.Navigator
      initialRouteName={ShopScreens.HOME}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <Shop.Screen
        name={ShopScreens.HOME}
        component={ShopHome}
        options={{
          headerLeft: () => null,
          headerTitle: () => <HeaderTitle>{t('Shop with crypto')}</HeaderTitle>,
        }}
      />
      <Shop.Screen
        name={ShopScreens.ARCHIVED_GIFT_CARDS}
        component={ArchivedGiftCards}
        options={{
          headerTitle: () => <HeaderTitle>Archived Gift Cards</HeaderTitle>,
        }}
      />
    </Shop.Navigator>
  );
};

export default ShopStack;
