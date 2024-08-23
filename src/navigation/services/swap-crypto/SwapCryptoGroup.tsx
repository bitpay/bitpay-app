import React from 'react';
import {TouchableOpacity} from 'react-native';
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
import {SwapCryptoExchangeKey} from './utils/swap-crypto-utils';
import {
  changellyTxData,
  thorswapTxData,
} from '../../../store/swap-crypto/swap-crypto.models';
import {ExternalServicesSettingsScreens} from '../../tabs/settings/external-services/ExternalServicesGroup';
import SwapCryptoApproveErc20, {
  SwapCryptoApproveErc20Params,
} from './screens/SwapCryptoApproveErc20';

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
  SwapCryptoApproveErc20: SwapCryptoApproveErc20Params;
};

export enum SwapCryptoScreens {
  SWAP_CRYPTO_ROOT = 'SwapCryptoRoot',
  SWAP_CRYPTO_OFFERS = 'SwapCryptoOffers',
  CHANGELLY_CHECKOUT = 'ChangellyCheckout',
  THORSWAP_CHECKOUT = 'ThorswapCheckout',
  SWAP_CRYPTO_APPROVE = 'SwapCryptoApproveErc20',
}

const SwapCryptoGroup: React.FC<SwapCryptoProps> = ({SwapCrypto}) => {
  const {t} = useTranslation();
  const changellyHistory = useAppSelector(
    ({SWAP_CRYPTO}) => SWAP_CRYPTO.changelly,
  );
  const thorswapHistory = useAppSelector(
    ({SWAP_CRYPTO}) => SWAP_CRYPTO.thorswap,
  );

  type SwapTxs = {
    [key in SwapCryptoExchangeKey]: changellyTxData[] | thorswapTxData[];
  };
  type SwapHistoryPath = SwapCryptoExchangeKey | 'general';
  type SwapHistoryData = {
    path: SwapHistoryPath;
    exchangesWithHistory: number;
  };

  const swapTxs: SwapTxs = {
    changelly: Object.values(changellyHistory),
    thorswap: Object.values(thorswapHistory),
  };

  const getHistoryData = (swapTxs: SwapTxs): SwapHistoryData => {
    let exchangeWithTxs: SwapHistoryPath = 'general';
    let count = 0;

    for (const [key, value] of Object.entries(swapTxs)) {
      if (Array.isArray(value) && value.length > 0) {
        exchangeWithTxs = key as SwapHistoryPath;
        count++;
      }

      if (count > 1) {
        exchangeWithTxs = 'general';
      }
    }

    return {
      path: exchangeWithTxs,
      exchangesWithHistory: count,
    };
  };

  const swapHistoryData = getHistoryData(swapTxs);

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
              {swapHistoryData.exchangesWithHistory > 0 ? (
                <TouchableOpacity
                  onPress={() => {
                    switch (swapHistoryData.path) {
                      case 'changelly':
                        navigationRef.navigate(
                          ExternalServicesSettingsScreens.CHANGELLY_SETTINGS,
                        );
                        break;
                      case 'thorswap':
                        navigationRef.navigate(
                          ExternalServicesSettingsScreens.THORSWAP_SETTINGS,
                        );
                        break;
                      default:
                        navigationRef.navigate(
                          ExternalServicesSettingsScreens.SWAP_HISTORY_SELECTOR,
                        );
                        break;
                    }
                  }}>
                  <HistoryIcon width={42} height={42} />
                </TouchableOpacity>
              ) : null}
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
      <SwapCrypto.Screen
        name={SwapCryptoScreens.SWAP_CRYPTO_APPROVE}
        component={SwapCryptoApproveErc20}
        options={{
          gestureEnabled: false,
          headerTitle: () => <HeaderTitle>{t('Approve Swap')}</HeaderTitle>,
        }}
      />
    </SwapCrypto.Group>
  );
};

export default SwapCryptoGroup;
