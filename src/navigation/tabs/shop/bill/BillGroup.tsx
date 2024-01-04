import React from 'react';
import {useTranslation} from 'react-i18next';
import ConnectBills from './screens/ConnectBills';
import Payments from './screens/Payments';
import Payment from './screens/Payment';
import AmountScreen, {
  AmountScreenParamList,
} from '../../../wallet/screens/AmountScreen';
import BillConfirm, {
  BillConfirmParamList,
} from '../../../wallet/screens/send/confirm/BillConfirm';
import {HeaderTitle} from '../../../../components/styled/Text';
import {BillPayAccount, BillPayment} from '../../../../store/shop/shop.models';
import PayBill from './screens/PayBill';
import PayAllBills from './screens/PayAllBills';
import BillSettings from './screens/BillSettings';
import ConnectBillsOptions from './screens/ConnectBillsOptions';
import {Root} from '../../../../Root';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderBackButton} from '@react-navigation/elements';
import {PayProConfirmTwoFactorParamList} from '../../../../navigation/wallet/screens/send/confirm/PayProConfirmTwoFactor';

interface BillProps {
  Bill: typeof Root;
}

export type BillGroupParamList = {
  BillAmount: AmountScreenParamList;
  BillConfirm: BillConfirmParamList;
  BillConfirmTwoFactor: PayProConfirmTwoFactorParamList;
  ConnectBills: {tokenType: 'auth' | 'link'};
  ConnectBillsOptions: {};
  BillSettings: {};
  Payment: {account: BillPayAccount; payment: BillPayment};
  PayBill: {account: BillPayAccount};
  PayAllBills: {accounts: BillPayAccount[]};
  Payments: {account?: BillPayAccount};
};

export enum BillScreens {
  BILL_AMOUNT = 'BillAmount',
  BILL_CONFIRM = 'BillConfirm',
  BILL_SETTINGS = 'BillSettings',
  CONNECT_BILLS = 'ConnectBills',
  CONNECT_BILLS_OPTIONS = 'ConnectBillsOptions',
  PAYMENT = 'Payment',
  PAY_BILL = 'PayBill',
  PAY_ALL_BILLS = 'PayAllBills',
  PAYMENTS = 'Payments',
}

const BillGroup: React.FC<BillProps> = ({Bill}) => {
  const {t} = useTranslation();
  return (
    <Bill.Group
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
      <Bill.Screen
        options={{
          headerTitle: () => <HeaderTitle>{t('Confirm Payment')}</HeaderTitle>,
        }}
        name={BillScreens.BILL_CONFIRM}
        component={BillConfirm} // TODO TODO
      />
      <Bill.Screen
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Method (Bill Pay) Settings')}</HeaderTitle>
          ),
        }}
        name={BillScreens.BILL_SETTINGS}
        component={BillSettings}
      />
      <Bill.Screen
        options={{headerShown: false}}
        name={BillScreens.CONNECT_BILLS}
        component={ConnectBills}
      />
      <Bill.Screen
        name={BillScreens.CONNECT_BILLS_OPTIONS}
        component={ConnectBillsOptions}
      />
      <Bill.Screen name={BillScreens.PAY_BILL} component={PayBill} />
      <Bill.Screen name={BillScreens.PAY_ALL_BILLS} component={PayAllBills} />
      <Bill.Screen name={BillScreens.PAYMENTS} component={Payments} />
      <Bill.Screen name={BillScreens.PAYMENT} component={Payment} />
    </Bill.Group>
  );
};

export default BillGroup;
