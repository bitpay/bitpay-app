import React from 'react';
import {useTranslation} from 'react-i18next';
import {Theme} from '@react-navigation/native';
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
import {useStackScreenOptions} from '../../../utils/headerHelpers';

import BillsHome from './screens/BillsHome';

interface BillProps {
  Bill: typeof Root;
  theme: Theme;
}

export type BillGroupParamList = {
  BillsHome: {};
  BillAmount: AmountScreenParamList;
  BillConfirm: BillConfirmParamList;
  ConnectBills: {tokenType: 'auth' | 'link'};
  ConnectBillsOptions: {};
  BillSettings: {};
  Payment: {account: BillPayAccount; payment: BillPayment};
  PayBill: {account: BillPayAccount};
  PayAllBills: {accounts: BillPayAccount[]};
  Payments: {account?: BillPayAccount};
};

export enum BillScreens {
  BILLS_HOME = 'BillsHome',
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

const BillGroup: React.FC<BillProps> = ({Bill, theme}) => {
  const commonOptions = useStackScreenOptions(theme);
  const {t} = useTranslation();
  return (
    <Bill.Group screenOptions={commonOptions}>
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
        options={{headerShown: false, contentStyle: {paddingTop: 0}}}
        name={BillScreens.CONNECT_BILLS}
        component={ConnectBills}
      />
      <Bill.Screen
        name={BillScreens.CONNECT_BILLS_OPTIONS}
        component={ConnectBillsOptions}
      />
      <Bill.Screen name={BillScreens.BILL_AMOUNT} component={AmountScreen} />
      <Bill.Screen name={BillScreens.PAY_BILL} component={PayBill} />
      <Bill.Screen name={BillScreens.BILLS_HOME} component={BillsHome} />
      <Bill.Screen name={BillScreens.PAY_ALL_BILLS} component={PayAllBills} />
      <Bill.Screen name={BillScreens.PAYMENTS} component={Payments} />
      <Bill.Screen name={BillScreens.PAYMENT} component={Payment} />
    </Bill.Group>
  );
};

export default BillGroup;
