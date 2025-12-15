import React from 'react';
import {Theme} from '@react-navigation/native';
import {H7, HeaderTitle} from '../../components/styled/Text';
import {useTranslation} from 'react-i18next';
import {Root} from '../../Root';
import {useStackScreenOptions} from '../utils/headerHelpers';
import BuyAndSellRoot, {BuyAndSellRootProps} from './screens/BuyAndSellRoot';
import {IsSVMChain, IsVMChain} from '../../store/wallet/utils/currency';
import {
  AccountChainsContainer,
  WIDTH,
} from '../../components/styled/Containers';
import Blockie from '../../components/blockie/Blockie';
import {getEVMAccountName} from '../../store/wallet/utils/wallet';
import {RootState} from '../../store';
import {useAppSelector} from '../../utils/hooks';
import MoonpaySellCheckout, {
  MoonpaySellCheckoutProps,
} from './sell-crypto/screens/MoonpaySellCheckout';
import RampSellCheckout, {
  RampSellCheckoutProps,
} from './sell-crypto/screens/RampSellCheckout';
import SimplexSellCheckout, {
  SimplexSellCheckoutProps,
} from './sell-crypto/screens/SimplexSellCheckout';

interface ExternalServicesProps {
  ExternalServices: typeof Root;
  theme: Theme;
}

export type ExternalServicesGroupParamList = {
  BuyAndSellRoot: BuyAndSellRootProps;
  MoonpaySellCheckout: MoonpaySellCheckoutProps;
  RampSellCheckout: RampSellCheckoutProps;
  SimplexSellCheckout: SimplexSellCheckoutProps;
};

export enum ExternalServicesScreens {
  ROOT_BUY_AND_SELL = 'BuyAndSellRoot',
  MOONPAY_SELL_CHECKOUT = 'MoonpaySellCheckout',
  RAMP_SELL_CHECKOUT = 'RampSellCheckout',
  SIMPLEX_SELL_CHECKOUT = 'SimplexSellCheckout',
}

const ExternalServicesGroup: React.FC<ExternalServicesProps> = ({
  ExternalServices,
  theme,
}) => {
  const commonOptions = useStackScreenOptions(theme);
  const allKeys = useAppSelector(({WALLET}: RootState) => WALLET.keys);
  const {t} = useTranslation();
  return (
    <ExternalServices.Group screenOptions={commonOptions}>
      <ExternalServices.Screen
        name={ExternalServicesScreens.ROOT_BUY_AND_SELL}
        component={BuyAndSellRoot}
        options={({route}) => ({
          headerTitle: () => {
            switch (route.params.context) {
              case 'buyCrypto':
                return <HeaderTitle>{t('Buy')}</HeaderTitle>;
              case 'sellCrypto':
                return <HeaderTitle>{t('Sell')}</HeaderTitle>;
              default:
                return undefined;
            }
          },
          headerRight: () =>
            route.params?.fromWallet ? (
              IsVMChain(route.params.fromWallet.chain) ? (
                <AccountChainsContainer
                  padding="8px"
                  maxWidth={`${WIDTH / 2 - 50}px`}>
                  <Blockie
                    size={19}
                    seed={route.params.fromWallet.receiveAddress}
                  />
                  <H7
                    ellipsizeMode="tail"
                    numberOfLines={1}
                    style={{flexShrink: 1, fontSize: 13, letterSpacing: 0}}>
                    {getEVMAccountName(route.params.fromWallet, allKeys)
                      ? getEVMAccountName(route.params.fromWallet, allKeys)
                      : `${
                          IsSVMChain(route.params.fromWallet.chain)
                            ? 'Solana Account'
                            : 'EVM Account'
                        }${
                          Number(
                            route.params.fromWallet.credentials?.account,
                          ) === 0
                            ? ''
                            : ` (${route.params.fromWallet.credentials?.account})`
                        }`}
                  </H7>
                </AccountChainsContainer>
              ) : null
            ) : null,
        })}
      />
      <ExternalServices.Screen
        name={ExternalServicesScreens.MOONPAY_SELL_CHECKOUT}
        component={MoonpaySellCheckout}
        options={{
          headerTitle: () => <HeaderTitle>{t('Sell Crypto')}</HeaderTitle>,
        }}
      />
      <ExternalServices.Screen
        name={ExternalServicesScreens.RAMP_SELL_CHECKOUT}
        component={RampSellCheckout}
        options={{
          headerTitle: () => <HeaderTitle>{t('Sell Crypto')}</HeaderTitle>,
        }}
      />
      <ExternalServices.Screen
        name={ExternalServicesScreens.SIMPLEX_SELL_CHECKOUT}
        component={SimplexSellCheckout}
        options={{
          headerTitle: () => <HeaderTitle>{t('Sell Crypto')}</HeaderTitle>,
        }}
      />
    </ExternalServices.Group>
  );
};

export default ExternalServicesGroup;
