import React from 'react';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {Theme} from '@react-navigation/native';
import {HeaderTitle} from '../../../components/styled/Text';
import SwapCryptoRoot, {
  SwapCryptoRootScreenParams,
} from './screens/SwapCryptoRoot';
import {HeaderRightContainer} from '../../../components/styled/Containers';
import {useAppSelector} from '../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import {Root, navigationRef} from '../../../Root';
import {useStackScreenOptions} from '../../utils/headerHelpers';
import {SwapCryptoExchangeKey} from './utils/swap-crypto-utils';
import {
  changellyTxData,
  thorswapTxData,
} from '../../../store/swap-crypto/swap-crypto.models';
import {ExternalServicesSettingsScreens} from '../../tabs/settings/external-services/ExternalServicesGroup';
import SwapCryptoApproveErc20, {
  SwapCryptoApproveErc20Params,
} from './screens/SwapCryptoApproveErc20';
import {LightBlack, Slate10} from '../../../styles/colors';
import SwapHistoryIcon from '../../../components/icons/external-services/swap/SwapHistoryIcon';

interface SwapCryptoProps {
  SwapCrypto: typeof Root;
  theme: Theme;
}

export type SwapCryptoGroupParamList = {
  SwapCryptoRoot: SwapCryptoRootScreenParams;
  SwapCryptoApproveErc20: SwapCryptoApproveErc20Params;
};

export enum SwapCryptoScreens {
  SWAP_CRYPTO_ROOT = 'SwapCryptoRoot',
  SWAP_CRYPTO_APPROVE = 'SwapCryptoApproveErc20',
}

const SwapCryptoGroup = ({SwapCrypto, theme}: SwapCryptoProps) => {
  const commonOptions = useStackScreenOptions(theme);
  const {t} = useTranslation();
  const changellyHistory: changellyTxData = useAppSelector(
    ({SWAP_CRYPTO}) => SWAP_CRYPTO.changelly,
  );
  const thorswapHistory: thorswapTxData = useAppSelector(
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
    <SwapCrypto.Group screenOptions={commonOptions}>
      <SwapCrypto.Screen
        name={SwapCryptoScreens.SWAP_CRYPTO_ROOT}
        component={SwapCryptoRoot}
        options={{
          headerTitle: () => <HeaderTitle>{t('Swap')}</HeaderTitle>,
          headerRight: () => (
            <HeaderRightContainer>
              {swapHistoryData.exchangesWithHistory > 0 ? (
                <TouchableOpacity
                  style={{
                    borderRadius: 100,
                    backgroundColor: theme.dark ? LightBlack : Slate10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
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
                  <SwapHistoryIcon width={42} height={42} />
                </TouchableOpacity>
              ) : null}
            </HeaderRightContainer>
          ),
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
