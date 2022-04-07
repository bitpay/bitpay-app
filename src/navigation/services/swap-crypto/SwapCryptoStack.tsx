import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {TouchableOpacity} from 'react-native';
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
import HistoryIcon from '../../../../assets/img/services/swap-crypto/icon-history.svg';
import {useAppSelector} from '../../../utils/hooks';
import {RootState} from '../../../store';

export type SwapCryptoStackParamList = {
  Root?: {
    selectedWallet?: any;
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
  const changellyHistory = useAppSelector(
    ({SWAP_CRYPTO}: RootState) => SWAP_CRYPTO.changelly,
  );
  const changellyTxs = Object.values(changellyHistory);

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
              {changellyTxs.length === 0 && (
                <Button
                  buttonType={'pill'}
                  buttonStyle={'cancel'}
                  onPress={() => {
                    navigation.dispatch(StackActions.pop(2));
                  }}>
                  Cancel
                </Button>
              )}
              {changellyTxs.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('ExternalServicesSettings', {
                      screen: 'ChangellySettings',
                    });
                  }}>
                  <HistoryIcon width={50} height={50} />
                </TouchableOpacity>
              )}
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
