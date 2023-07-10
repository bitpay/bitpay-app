import React from 'react';
import moment from 'moment';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {ActiveOpacity} from '../../../../../components/styled/Containers';
import BillItem from './BillItem';
import {
  BillPayAccount,
  BillPayPayment,
  BillPayment,
} from '../../../../../store/shop/shop.models';
import {APP_NETWORK} from '../../../../../constants/config';
import {useAppSelector} from '../../../../../utils/hooks';

const sortByAscendingDate = (a: BillPayAccount, b: BillPayAccount) => {
  const farIntoTheFuture = moment().add(1, 'year').toDate();
  const fartherIntoTheFuture = moment().add(2, 'years').toDate();
  return (
    new Date(
      a.isPayable
        ? a[a.type].nextPaymentDueDate || farIntoTheFuture
        : fartherIntoTheFuture,
    ).getTime() -
    new Date(
      b.isPayable
        ? b[b.type].nextPaymentDueDate || farIntoTheFuture
        : fartherIntoTheFuture,
    ).getTime()
  );
};

export const BillList = ({
  accounts,
  variation,
  onPress,
}: {
  accounts: BillPayAccount[];
  variation: 'large' | 'small' | 'pay';
  onPress: (account: BillPayAccount) => void;
}) => {
  const persistedBillPayPayments = useAppSelector(
    ({SHOP}) => SHOP.billPayPayments[APP_NETWORK],
  ) as BillPayPayment[];
  const allProcessingPayments = persistedBillPayPayments
    .filter(
      billPayment =>
        new Date(billPayment.createdOn) > moment().subtract(5, 'days').toDate(),
    )
    .reduce((paymentList: BillPayment[], billPayPayment) => {
      return [
        ...paymentList,
        ...billPayPayment.payments.filter(
          payment =>
            (!payment.status &&
              new Date(billPayPayment.createdOn) >
                moment().subtract(1, 'day').toDate()) ||
            ['pending', 'processing'].includes(payment.status),
        ),
      ];
    }, []);
  const accountsWithPayments = accounts.map(account => {
    const processingPayments = allProcessingPayments.filter(
      payment => payment.partnerAccountId === account.id,
    );
    const processingAmount = processingPayments.reduce(
      (sum, payment) => payment.amount + sum,
      0,
    );
    const minPaymentDue = account[account.type].nextPaymentMinimumAmount || 0;
    const newMinPaymentDue = minPaymentDue - processingAmount;
    const nextPaymentMinimumAmount =
      newMinPaymentDue > 0 ? newMinPaymentDue : 0;
    return {
      ...account,
      [account.type]: {
        ...account[account.type],
        ...((!nextPaymentMinimumAmount ||
          account[account.type].balance < 0) && {
          nextPaymentDueDate: undefined,
          paddedNextPaymentDueDate: undefined,
        }),
        nextPaymentMinimumAmount,
      },
    };
  });
  return (
    <>
      {accountsWithPayments.sort(sortByAscendingDate).map((account, index) => {
        return (
          <TouchableOpacity
            key={index}
            activeOpacity={account.isPayable ? ActiveOpacity : 1}
            onPress={() => {
              if (!account.isPayable) {
                return;
              }
              onPress(account);
            }}>
            <BillItem account={account} variation={variation} />
          </TouchableOpacity>
        );
      })}
    </>
  );
};
