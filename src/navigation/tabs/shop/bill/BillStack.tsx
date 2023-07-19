import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {useTranslation} from 'react-i18next';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../../constants/NavigationOptions';
import ConnectBills from './screens/ConnectBills';
import Payments from './screens/Payments';
import Payment from './screens/Payment';
import AmountScreen, {
  AmountScreenParamList,
} from '../../../wallet/screens/AmountScreen';
import Confirm, {
  BillConfirmParamList,
} from '../../../wallet/screens/send/confirm/BillConfirm';
import {HeaderTitle} from '../../../../components/styled/Text';
import PayProConfirmTwoFactor, {
  PayProConfirmTwoFactorParamList,
} from '../../../wallet/screens/send/confirm/PayProConfirmTwoFactor';
import {BillPayAccount, BillPayment} from '../../../../store/shop/shop.models';
import PayBill from './screens/PayBill';
import PayAllBills from './screens/PayAllBills';
import BillSettings from './screens/BillSettings';

export type BillStackParamList = {
  BillAmount: AmountScreenParamList;
  BillConfirm: BillConfirmParamList;
  BillConfirmTwoFactor: PayProConfirmTwoFactorParamList;
  ConnectBills: {};
  BillSettings: {};
  Payment: {account: BillPayAccount; payment: BillPayment};
  PayBill: {account: BillPayAccount};
  PayAllBills: {accounts: BillPayAccount[]};
  Payments: {account?: BillPayAccount};
};

export enum BillScreens {
  BILL_AMOUNT = 'BillAmount',
  BILL_CONFIRM = 'BillConfirm',
  BILL_CONFIRM_TWO_FACTOR = 'BillConfirmTwoFactor',
  BILL_SETTINGS = 'BillSettings',
  CONNECT_BILLS = 'ConnectBills',
  PAYMENT = 'Payment',
  PAY_BILL = 'PayBill',
  PAY_ALL_BILLS = 'PayAllBills',
  PAYMENTS = 'Payments',
}

const Bill = createStackNavigator<BillStackParamList>();

const BillStack = () => {
  const {t} = useTranslation();
  return (
    <Bill.Navigator
      initialRouteName={BillScreens.CONNECT_BILLS}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <Bill.Screen name={BillScreens.BILL_AMOUNT} component={AmountScreen} />
      <Bill.Screen
        options={{
          headerTitle: () => <HeaderTitle>{t('Confirm Payment')}</HeaderTitle>,
        }}
        name={BillScreens.BILL_CONFIRM}
        component={Confirm}
      />
      <Bill.Screen
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Two-Step Verification')}</HeaderTitle>
          ),
        }}
        name={BillScreens.BILL_CONFIRM_TWO_FACTOR}
        component={PayProConfirmTwoFactor}
      />
      <Bill.Screen
        options={{
          headerTitle: () => <HeaderTitle>{t('Method (Bill Pay) Settings')}</HeaderTitle>,
        }}
        name={BillScreens.BILL_SETTINGS}
        component={BillSettings}
      />
      <Bill.Screen
        options={{headerShown: false}}
        name={BillScreens.CONNECT_BILLS}
        component={ConnectBills}
      />
      <Bill.Screen name={BillScreens.PAY_BILL} component={PayBill} />
      <Bill.Screen name={BillScreens.PAY_ALL_BILLS} component={PayAllBills} />
      <Bill.Screen name={BillScreens.PAYMENTS} component={Payments} />
      <Bill.Screen name={BillScreens.PAYMENT} component={Payment} />
    </Bill.Navigator>
  );
};

export default BillStack;
