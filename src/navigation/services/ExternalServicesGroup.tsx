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

interface ExternalServicesProps {
  ExternalServices: typeof Root;
  theme: Theme;
}

export type ExternalServicesGroupParamList = {
  BuyAndSellRoot: BuyAndSellRootProps;
};

export enum ExternalServicesScreens {
  ROOT_BUY_AND_SELL = 'BuyAndSellRoot',
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
          headerTitle: () => <HeaderTitle>{t('Buy')}</HeaderTitle>, // TODO: change title dynamically between Buy/Sell
          headerRight: () =>
            route.params?.wallet ? (
              IsVMChain(route.params.wallet.chain) ? (
                <AccountChainsContainer
                  padding="8px"
                  maxWidth={`${WIDTH / 2 - 50}px`}>
                  <Blockie
                    size={19}
                    seed={route.params.wallet.receiveAddress}
                  />
                  <H7
                    ellipsizeMode="tail"
                    numberOfLines={1}
                    style={{flexShrink: 1, fontSize: 13, letterSpacing: 0}}>
                    {getEVMAccountName(route.params.wallet, allKeys)
                      ? getEVMAccountName(route.params.wallet, allKeys)
                      : `${
                          IsSVMChain(route.params.wallet.chain)
                            ? 'Solana Account'
                            : 'EVM Account'
                        }${
                          Number(route.params.wallet.credentials?.account) === 0
                            ? ''
                            : ` (${route.params.wallet.credentials?.account})`
                        }`}
                  </H7>
                </AccountChainsContainer>
              ) : null
            ) : null,
        })}
      />
    </ExternalServices.Group>
  );
};

export default ExternalServicesGroup;
