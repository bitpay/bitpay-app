import React from 'react';
import {TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {HeaderTitle} from '../../../components/styled/Text';
import SwapCryptoRoot, {
  SwapCryptoRootScreenParams,
} from './screens/SwapCryptoRoot';
import SwapCryptoOffers, {
  SwapCryptoOffersScreenParams,
} from './screens/SwapCryptoOffers';
import ChangellyCheckout from './screens/ChangellyCheckout';
import ThorswapCheckout, {
  ThorswapCheckoutProps,
} from './screens/ThorswapCheckout';
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
  SwapCryptoRoot: SwapCryptoRootScreenParams;
  SwapCryptoOffers: SwapCryptoOffersScreenParams;
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
  ThorswapCheckout: ThorswapCheckoutProps | undefined;
};

export enum SwapCryptoScreens {
  SWAP_CRYPTO_ROOT = 'SwapCryptoRoot',
  SWAP_CRYPTO_OFFERS = 'SwapCryptoOffers',
  CHANGELLY_CHECKOUT = 'ChangellyCheckout',
  THORSWAP_CHECKOUT = 'ThorswapCheckout',
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
        name={SwapCryptoScreens.SWAP_CRYPTO_ROOT}
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
        name={SwapCryptoScreens.SWAP_CRYPTO_OFFERS}
        component={SwapCryptoOffers}
        options={{
          headerTitle: () => <HeaderTitle>{t('Offers')}</HeaderTitle>,
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
      <SwapCrypto.Screen
        name={SwapCryptoScreens.THORSWAP_CHECKOUT}
        component={ThorswapCheckout}
        options={{
          gestureEnabled: false,
          headerTitle: () => <HeaderTitle>{t('Swap Checkout')}</HeaderTitle>,
        }}
      />
    </SwapCrypto.Group>
  );
};

export default SwapCryptoGroup;
