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
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../constants/NavigationOptions';
import {HeaderBackButton} from '@react-navigation/elements';

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
      screenOptions={({navigation}) => ({
        ...baseNavigatorOptions,
        headerShown: false,
        headerLeft: () => (
          <HeaderBackButton
            onPress={() => {
              navigation.goBack();
            }}
            {...baseNativeHeaderBackButtonProps}
          />
        ),
      })}>
      <Coinbase.Screen
        name={CoinbaseScreens.ROOT}
        component={CoinbaseRoot}
        options={{
          headerShown: true,
        }}
      />
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
