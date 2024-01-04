import React from 'react';
import {TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {HeaderTitle} from '../../../components/styled/Text';
import SwapCryptoRoot from './screens/SwapCryptoRoot';
import ChangellyCheckout from './screens/ChangellyCheckout';
import {HeaderRightContainer} from '../../../components/styled/Containers';
import {Wallet} from '../../../store/wallet/wallet.models';
import HistoryIcon from '../../../../assets/img/services/swap-crypto/icon-history.svg';
import {useAppSelector} from '../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import {Root, navigationRef} from '../../../Root';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../../constants/NavigationOptions';
import {HeaderBackButton} from '@react-navigation/elements';

interface SwapCryptoProps {
  SwapCrypto: typeof Root;
}

export type SwapCryptoGroupParamList = {
  SwapCryptoRoot:
    | {
        selectedWallet?: Wallet;
      }
    | undefined;
  ChangellyCheckout:
    | {
        fromWalletSelected: Wallet;
        toWalletSelected: Wallet;
        fixedRateId: string;
        amountFrom: number;
        useSendMax?: boolean;
        sendMaxInfo?: any;
      }
    | undefined;
};

export enum SwapCryptoScreens {
  SWAPCRYPTO_ROOT = 'SwapCryptoRoot',
  CHANGELLY_CHECKOUT = 'ChangellyCheckout',
}

const SwapCryptoGroup: React.FC<SwapCryptoProps> = ({SwapCrypto}) => {
  const {t} = useTranslation();
  const changellyHistory = useAppSelector(
    ({SWAP_CRYPTO}) => SWAP_CRYPTO.changelly,
  );
  const changellyTxs = Object.values(changellyHistory);

  return (
    <SwapCrypto.Group
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
      <SwapCrypto.Screen
        name={SwapCryptoScreens.SWAPCRYPTO_ROOT}
        component={SwapCryptoRoot}
        options={{
          headerTitle: () => <HeaderTitle>{t('Swap Crypto')}</HeaderTitle>,
          headerRight: () => (
            <HeaderRightContainer>
              {!!changellyTxs.length && (
                <TouchableOpacity
                  onPress={() => {
                    navigationRef.navigate('ChangellySettings');
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
    </SwapCrypto.Group>
  );
};

export default SwapCryptoGroup;
