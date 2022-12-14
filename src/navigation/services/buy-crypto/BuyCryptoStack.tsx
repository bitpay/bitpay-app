import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {useNavigation} from '@react-navigation/native';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../components/styled/Text';
import BuyCryptoRoot, {
  BuyCryptoRootScreenParams,
} from './screens/BuyCryptoRoot';
import BuyCryptoOffers from './screens/BuyCryptoOffers';
import {useTranslation} from 'react-i18next';

export type BuyCryptoStackParamList = {
  BuyCryptoRoot: BuyCryptoRootScreenParams;
  BuyCryptoOffers: {
    amount: number;
    fiatCurrency: string;
    coin: string;
    chain: string;
    country: string;
    selectedWallet: any;
    paymentMethod: any;
  };
};

export enum BuyCryptoScreens {
  ROOT = 'BuyCryptoRoot',
  OFFERS = 'BuyCryptoOffers',
}

const BuyCrypto = createStackNavigator<BuyCryptoStackParamList>();

const BuyCryptoStack = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  return (
    <BuyCrypto.Navigator
      initialRouteName={BuyCryptoScreens.ROOT}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <BuyCrypto.Screen
        name={BuyCryptoScreens.ROOT}
        component={BuyCryptoRoot}
        options={{
          headerTitle: () => <HeaderTitle>{t('Order Summary')}</HeaderTitle>,
        }}
      />
      <BuyCrypto.Screen
        name={BuyCryptoScreens.OFFERS}
        component={BuyCryptoOffers}
        options={{
          ...baseScreenOptions,
          headerTitle: () => <HeaderTitle>{t('Offers')}</HeaderTitle>,
        }}
      />
    </BuyCrypto.Navigator>
  );
};

export default BuyCryptoStack;
