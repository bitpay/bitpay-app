import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {useNavigation, StackActions} from '@react-navigation/native';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../components/styled/Text';
import SwapCryptoRoot from './screens/SwapCryptoRoot';
import ChangellyCheckout from './screens/ChangellyCheckout';
import {HeaderRightContainer} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {Wallet} from '../../../store/wallet/wallet.models';

export type SwapCryptoStackParamList = {
  Root?: {
    fromWallet?: any;
  };
  ChangellyCheckout?: {
    fromWalletSelected: Wallet;
    toWalletSelected: Wallet;
    fromWalletData: any;
    toWalletData: any;
    fixedRateId: string;
    amountFrom: number;
    rate: number;
    useSendMax?: boolean;
    sendMaxInfo?: any;
  };
};

export enum SwapCryptoScreens {
  ROOT = 'Root',
  CHANGELLY_CHECKOUT = 'ChangellyCheckout',
}

const SwapCrypto = createStackNavigator<SwapCryptoStackParamList>();

const SwapCryptoStack = () => {
  const navigation = useNavigation();

  return (
    <SwapCrypto.Navigator
      initialRouteName={SwapCryptoScreens.ROOT}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <SwapCrypto.Screen
        name={SwapCryptoScreens.ROOT}
        component={SwapCryptoRoot}
        options={{
          headerTitle: () => <HeaderTitle>Swap Crypto</HeaderTitle>,
          headerRight: () => (
            <HeaderRightContainer>
              <Button
                buttonType={'pill'}
                buttonStyle={'cancel'}
                onPress={() => {
                  navigation.dispatch(StackActions.pop(2));
                }}>
                Cancel
              </Button>
            </HeaderRightContainer>
          ),
        }}
      />
      <SwapCrypto.Screen
        name={SwapCryptoScreens.CHANGELLY_CHECKOUT}
        component={ChangellyCheckout}
        options={{
          ...baseScreenOptions,
          headerTitle: () => <HeaderTitle>Swap Checkout</HeaderTitle>,
          headerRight: () => (
            <HeaderRightContainer>
              <Button
                buttonType={'pill'}
                buttonStyle={'cancel'}
                onPress={() => {
                  navigation.dispatch(StackActions.pop(2));
                }}>
                Cancel
              </Button>
            </HeaderRightContainer>
          ),
        }}
      />
    </SwapCrypto.Navigator>
  );
};

export default SwapCryptoStack;
