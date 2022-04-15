import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import styled from 'styled-components/native';
import {useTheme} from '@react-navigation/native';
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
import CoinbaseSettings from './screens/CoinbaseSettings';
import CoinbaseWithdrawConfirm from './screens/CoinbaseWithdrawConfirm';
import CoinbaseTransaction, {
  CoinbaseTransactionScreenParamList,
} from './screens/CoinbaseTransaction';
import {CoinbaseWithdrawConfirmParamList} from './screens/CoinbaseWithdrawConfirm';
import {Black} from '../../styles/colors';
import CoinbaseSvg from '../../../assets/img/logos/coinbase.svg';

export type CoinbaseStackParamList = {
  CoinbaseRoot: CoinbaseRootScreenParamList;
  CoinbaseSettings: undefined;
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

const HeaderTitleContainer = styled.View`
  flex: 1;
  flex-direction: row;
  justify-content: center;
  padding-top: 10px;
`;

const Coinbase = createStackNavigator<CoinbaseStackParamList>();

const CoinbaseStack = () => {
  const theme = useTheme();
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
          headerStyle: {
            backgroundColor: theme.dark ? Black : 'rgb(245, 246, 248)',
          },
          headerTitle: () => (
            <HeaderTitleContainer>
              <CoinbaseSvg style={{marginRight: 10}} />
              <HeaderTitle style={{marginTop: 3}}>{'Coinbase'}</HeaderTitle>
            </HeaderTitleContainer>
          ),
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
      <Coinbase.Screen
        name={CoinbaseScreens.WITHDRAW}
        component={CoinbaseWithdrawConfirm}
        options={{
          headerMode: 'screen',
          headerTitle: () => <HeaderTitle>{t('Confirm Withdraw')}</HeaderTitle>,
          gestureEnabled: false,
        }}
      />
    </Coinbase.Navigator>
  );
};

export default CoinbaseStack;
