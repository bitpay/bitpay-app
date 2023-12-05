import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {HeaderTitle} from '../../components/styled/Text';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
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
import CoinbaseWithdrawConfirm from './screens/CoinbaseWithdrawConfirm';
import CoinbaseTransaction, {
  CoinbaseTransactionScreenParamList,
} from './screens/CoinbaseTransaction';
import {CoinbaseWithdrawConfirmParamList} from './screens/CoinbaseWithdrawConfirm';
import {HeaderBackButton} from '@react-navigation/elements';

export type CoinbaseStackParamList = {
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

const Coinbase = createNativeStackNavigator<CoinbaseStackParamList>();

const CoinbaseStack = () => {
  const {t} = useTranslation();
  return (
    <Coinbase.Navigator
      initialRouteName={CoinbaseScreens.ROOT}
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
    </Coinbase.Navigator>
  );
};

export default CoinbaseStack;
