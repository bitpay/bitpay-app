import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../components/styled/Text';
import BuyCryptoRoot, {
  BuyCryptoRootScreenParams,
} from './screens/BuyCryptoRoot';
import BuyCryptoOffers, {
  BuyCryptoOffersScreenParams,
} from './screens/BuyCryptoOffers';
import {useTranslation} from 'react-i18next';
import {HeaderBackButton} from '@react-navigation/elements';

export type BuyCryptoStackParamList = {
  BuyCryptoRoot: BuyCryptoRootScreenParams;
  BuyCryptoOffers: BuyCryptoOffersScreenParams;
};

export enum BuyCryptoScreens {
  ROOT = 'BuyCryptoRoot',
  OFFERS = 'BuyCryptoOffers',
}

const BuyCrypto = createNativeStackNavigator<BuyCryptoStackParamList>();

const BuyCryptoStack = () => {
  const {t} = useTranslation();
  return (
    <BuyCrypto.Navigator
      initialRouteName={BuyCryptoScreens.ROOT}
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
          headerTitle: () => <HeaderTitle>{t('Offers')}</HeaderTitle>,
        }}
      />
    </BuyCrypto.Navigator>
  );
};

export default BuyCryptoStack;
