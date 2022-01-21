import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../components/styled/Text';
import BuyCryptoRoot from './screens/BuyCryptoRoot';
import BuyCryptoOffers from './screens/BuyCryptoOffers';
import {HeaderRightContainer} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {useNavigation} from '@react-navigation/native';

export type BuyCryptoStackParamList = {
  Root?: {
    fromWallet?: any;
  };
  BuyCryptoOffers: {
    amount: number;
    fiatCurrency: string;
    coin: string;
    country: string;
    selectedWallet: any;
    paymentMethod: any;
  };
};

export enum BuyCryptoScreens {
  ROOT = 'Root',
  OFFERS = 'BuyCryptoOffers',
}

const BuyCrypto = createStackNavigator<BuyCryptoStackParamList>();

const BuyCryptoStack = () => {
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
          headerTitle: () => <HeaderTitle>Order Summary</HeaderTitle>,
          headerRight: () => (
            <HeaderRightContainer>
              <Button
                buttonType={'pill'}
                onPress={() => {
                  navigation.goBack();
                }}>
                Cancel
              </Button>
            </HeaderRightContainer>
          ),
        }}
      />
      <BuyCrypto.Screen
        name={BuyCryptoScreens.OFFERS}
        component={BuyCryptoOffers}
        options={{
          ...baseScreenOptions,
          headerTitle: () => <HeaderTitle>Offers</HeaderTitle>,
          headerRight: () => (
            <HeaderRightContainer>
              <Button
                buttonType={'pill'}
                onPress={() => {
                  navigation.goBack();
                }}>
                Cancel
              </Button>
            </HeaderRightContainer>
          ),
        }}
      />
    </BuyCrypto.Navigator>
  );
};

export default BuyCryptoStack;
