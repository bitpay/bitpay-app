import React from 'react';
import {useTranslation} from 'react-i18next';
import {HeaderTitle} from '../../components/styled/Text';
import CoinbaseAccount, {
  CoinbaseAccountScreenParamList,
} from './screens/CoinbaseAccount';
import CoinbaseRoot, {
  CoinbaseRootScreenParamList,
} from './screens/CoinbaseRoot';
import CoinbaseSettings, {
  CoinbaseSettingsScreenParamList,
} from './screens/CoinbaseSettings';
import CoinbaseWithdrawConfirm from './screens/CoinbaseWithdrawConfirm';
import CoinbaseTransaction, {
  CoinbaseTransactionScreenParamList,
} from './screens/CoinbaseTransaction';
import {CoinbaseWithdrawConfirmParamList} from './screens/CoinbaseWithdrawConfirm';
import {Root} from '../../Root';
import {baseNavigatorOptions} from '../../constants/NavigationOptions';
import HeaderBackButton from '../../components/back/HeaderBackButton';

interface CoinbaseProps {
  Coinbase: typeof Root;
}

export type CoinbaseGroupParamList = {
  CoinbaseRoot: CoinbaseRootScreenParamList;
  CoinbaseSettings: CoinbaseSettingsScreenParamList;
  CoinbaseAccount: CoinbaseAccountScreenParamList;
  CoinbaseTransaction: CoinbaseTransactionScreenParamList;
  CoinbaseWithdraw: CoinbaseWithdrawConfirmParamList;
};

export enum CoinbaseScreens {
  ROOT = 'CoinbaseRoot',
  SETTINGS = 'CoinbaseSettings',
  ACCOUNT = 'CoinbaseAccount',
  TRANSACTION = 'CoinbaseTransaction',
  WITHDRAW = 'CoinbaseWithdraw',
}

const CoinbaseGroup: React.FC<CoinbaseProps> = ({Coinbase}) => {
  const {t} = useTranslation();
  return (
    <Coinbase.Group
      screenOptions={() => ({
        ...baseNavigatorOptions,
        headerLeft: () => <HeaderBackButton />,
      })}>
      <Coinbase.Screen name={CoinbaseScreens.ROOT} component={CoinbaseRoot} />
      <Coinbase.Screen
        name={CoinbaseScreens.SETTINGS}
        component={CoinbaseSettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Settings')}</HeaderTitle>,
        }}
      />
      <Coinbase.Screen
        name={CoinbaseScreens.ACCOUNT}
        component={CoinbaseAccount}
      />
      <Coinbase.Screen
        name={CoinbaseScreens.TRANSACTION}
        component={CoinbaseTransaction}
        options={{
          headerTitle: () => <HeaderTitle>{t('Details')}</HeaderTitle>,
        }}
      />
      <Coinbase.Screen
        name={CoinbaseScreens.WITHDRAW}
        component={CoinbaseWithdrawConfirm}
        options={{
          headerTitle: () => <HeaderTitle>{t('Confirm Withdraw')}</HeaderTitle>,
          gestureEnabled: false,
        }}
      />
    </Coinbase.Group>
  );
};

export default CoinbaseGroup;
