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
import {Wallet} from '../../../store/wallet/wallet.models';
import HistoryIcon from '../../../../assets/img/services/swap-crypto/icon-history.svg';
import {useAppSelector} from '../../../utils/hooks';
import {useTranslation} from 'react-i18next';

export type SwapCryptoStackParamList = {
  Root:
    | {
        selectedWallet?: Wallet;
      }
    | undefined;
  ChangellyCheckout:
    | {
        fromWalletSelected: Wallet;
        toWalletSelected: Wallet;
        fromWalletData: any;
        toWalletData: any;
        fixedRateId: string;
        amountFrom: number;
        useSendMax?: boolean;
        sendMaxInfo?: any;
      }
    | undefined;
};

export enum SwapCryptoScreens {
  ROOT = 'Root',
  CHANGELLY_CHECKOUT = 'ChangellyCheckout',
}

const SwapCrypto = createStackNavigator<SwapCryptoStackParamList>();

const SwapCryptoStack = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const changellyHistory = useAppSelector(
    ({SWAP_CRYPTO}) => SWAP_CRYPTO.changelly,
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
          headerTitle: () => <HeaderTitle>{t('Swap Crypto')}</HeaderTitle>,
          headerRight: () => (
            <HeaderRightContainer>
              {!!changellyTxs.length && (
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('ExternalServicesSettings', {
                      screen: 'ChangellySettings',
                    });
                  }}>
                  <HistoryIcon width={42} height={42} />
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
          gestureEnabled: false,
          headerTitle: () => <HeaderTitle>{t('Swap Checkout')}</HeaderTitle>,
        }}
      />
    </SwapCrypto.Navigator>
  );
};

export default SwapCryptoStack;
