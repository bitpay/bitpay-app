import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {HeaderTitle} from '../../components/styled/Text';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import CoinbaseAccount, {
  CoinbaseAccountScreenParamList,
} from './screens/CoinbaseAccount';
import CoinbaseRoot, {
  CoinbaseRootScreenParamList,
} from './screens/CoinbaseRoot';
import CoinbaseSettings, {
  CoinbaseSettingsScreenParamList,
} from './screens/CoinbaseSettings';
import CoinbaseTransaction, {
  CoinbaseTransactionScreenParamList,
} from './screens/CoinbaseTransaction';

export type CoinbaseStackParamList = {
  CoinbaseRoot: CoinbaseRootScreenParamList;
  CoinbaseSettings: CoinbaseSettingsScreenParamList;
  CoinbaseAccount: CoinbaseAccountScreenParamList;
  CoinbaseTransaction: CoinbaseTransactionScreenParamList;
};

export enum CoinbaseScreens {
  ROOT = 'CoinbaseRoot',
  SETTINGS = 'CoinbaseSettings',
  ACCOUNT = 'CoinbaseAccount',
  TRANSACTION = 'CoinbaseTransaction',
}

const Coinbase = createStackNavigator<CoinbaseStackParamList>();

const CoinbaseStack = () => {
  const {t} = useTranslation();
  return (
    <Coinbase.Navigator
      initialRouteName={CoinbaseScreens.ROOT}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
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
          headerMode: 'screen',
          headerTitle: () => <HeaderTitle>{t('Settings')}</HeaderTitle>,
        }}
      />
      <Coinbase.Screen
        name={CoinbaseScreens.ACCOUNT}
        component={CoinbaseAccount}
        options={{
          headerMode: 'screen',
        }}
      />
      <Coinbase.Screen
        name={CoinbaseScreens.TRANSACTION}
        component={CoinbaseTransaction}
        options={{
          headerMode: 'screen',
          headerTitle: () => <HeaderTitle>{t('Details')}</HeaderTitle>,
        }}
      />
    </Coinbase.Navigator>
  );
};

export default CoinbaseStack;
