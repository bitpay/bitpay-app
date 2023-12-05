import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../../constants/NavigationOptions';
import ShopHome, {ShopHomeParamList} from './ShopHome';
import {HeaderTitle} from '../../../components/styled/Text';
import {NavigatorScreenParams} from '@react-navigation/native';
import {CardConfigMap, GiftCard} from '../../../store/shop/shop.models';
import ArchivedGiftCards from './gift-card/screens/ArchivedGiftCards';
import {HeaderBackButton} from '@react-navigation/elements';
import {useTranslation} from 'react-i18next';

export type ShopStackParamList = {
  Home: NavigatorScreenParams<ShopHomeParamList>;
  ArchivedGiftCards: {
    giftCards: GiftCard[];
    supportedGiftCardMap: CardConfigMap;
  };
};

export enum ShopScreens {
  HOME = 'Home',
  ARCHIVED_GIFT_CARDS = 'ArchivedGiftCards',
}

const Shop = createNativeStackNavigator<ShopStackParamList>();

const ShopStack = () => {
  const {t} = useTranslation();
  return (
    <Shop.Navigator
      initialRouteName={ShopScreens.HOME}
      screenOptions={({navigation}) => ({
        ...baseNavigatorOptions,
        headerLeft: () => (
          <HeaderBackButton
            onPress={() => {
              navigation.goBack();
            }}
            {...baseNativeHeaderBackButtonProps}
          />
        ),
      })}>
      <Shop.Screen name={ShopScreens.HOME} component={ShopHome} />
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
