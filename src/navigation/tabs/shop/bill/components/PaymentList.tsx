import React, {useCallback, useEffect, useState} from 'react';
import {TouchableOpacity} from 'react-native-gesture-handler';
import styled from 'styled-components/native';
import {ActiveOpacity} from '../../../../../components/styled/Containers';
import NoPaymentsSvg from '../../../../../../assets/img/bills/no-payments.svg';
import BillItem from './BillItem';
import {
  BillPayAccount,
  BillPayPayment,
  BillPayment,
} from '../../../../../store/shop/shop.models';
import {Paragraph} from '../../../../../components/styled/Text';
import {LightBlack, Slate30} from '../../../../../styles/colors';
import {FlatList} from 'react-native';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {APP_NETWORK} from '../../../../../constants/config';
import {ShopEffects} from '../../../../../store/shop';

const ZeroStateContainer = styled.View`
  border: 1px solid ${({theme}) => (theme.dark ? LightBlack : Slate30)};
  border-radius: 8px;
  padding: 26px;
  justify-content: center;
  align-items: center;
  flex-direction: row;
`;

const NoPaymentsIcon = styled(NoPaymentsSvg)`
  margin-right: 8px;
`;

function sortByDescendingDate(a: BillPayPayment, b: BillPayPayment) {
  return new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime();
}

export const PaymentList = ({
  accounts,
  variation,
  onPress,
}: {
  accounts: BillPayAccount[];
  variation: 'large' | 'small';
  onPress: (account: BillPayAccount, payment: BillPayment) => void;
}) => {
  const dispatch = useAppDispatch();
  const account = accounts.length === 1 ? accounts[0] : undefined;
  const persistedBillPayPayments = useAppSelector(
    ({SHOP}) => SHOP.billPayPayments[APP_NETWORK],
  ) as BillPayPayment[];
  const billPayPayments = persistedBillPayPayments.sort(sortByDescendingDate);
  const [payments, setPayments] = useState(billPayPayments);
  const [noMorePayments, setNoMorePayments] = useState(false);
  const billPayPaymentIds = billPayPayments.map(payment => payment.id);
  const allPayments = payments.reduce(
    (paymentList: BillPayment[], billPayPayment) => {
      return [
        ...paymentList,
        ...billPayPayment.payments.map(billPayment => ({
          ...billPayment,
          createdOn: billPayPayment.createdOn,
        })),
      ];
    },
    [],
  );
  const paymentsWithAccounts = allPayments.filter(payment =>
    accounts.find(acc => acc.id === payment.partnerAccountId),
  );
  const keyExtractor = (item: BillPayment, index: number) =>
    item.partnerPaymentId || `${index}`;

  const renderItem = useCallback(
    ({item}: {item: BillPayment}) => {
      const payment = item;
      const associatedAccount = accounts.find(
        acc => acc.id === payment.partnerAccountId,
      ) as BillPayAccount;

      return (
        <TouchableOpacity
          activeOpacity={ActiveOpacity}
          onPress={() => onPress(associatedAccount, payment)}>
          <BillItem
            account={associatedAccount}
            payment={payment}
            variation={variation}
          />
        </TouchableOpacity>
      );
    },
    [accounts, onPress, variation],
  );

  const fetchMore = async () => {
    const lastPayment = paymentsWithAccounts[paymentsWithAccounts.length - 1];
    const lastPaymentDate = lastPayment.createdOn;
    if (noMorePayments) {
      return;
    }
    const latestBillPayPayments = await dispatch(
      ShopEffects.startFindBillPayments({
        ...(account && {partnerAccountId: account.id}),
        endDate: lastPaymentDate,
      }),
    );
    const latestUniqueBillPayments = latestBillPayPayments.filter(
      billPayPayment => !billPayPaymentIds.includes(billPayPayment.id),
    );
    if (!latestUniqueBillPayments.length) {
      setNoMorePayments(true);
      return;
    }
    setPayments(
      [...billPayPayments, ...latestUniqueBillPayments].sort(
        sortByDescendingDate,
      ),
    );
  };

  useEffect(() => {
    const getPayments = async () => {
      const latestBillPayPayments = await dispatch(
        ShopEffects.startFindBillPayments(
          account ? {partnerAccountId: account.id} : undefined,
        ),
      );
      const latestUniqueBillPayments = latestBillPayPayments.filter(
        billPayPayment => !billPayPaymentIds.includes(billPayPayment.id),
      );
      setPayments(
        [...billPayPayments, ...latestUniqueBillPayments].sort(
          sortByDescendingDate,
        ),
      );
    };
    getPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {paymentsWithAccounts.length ? (
        <>
          <FlatList
            contentContainerStyle={{paddingBottom: 200}}
            data={paymentsWithAccounts}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            onEndReachedThreshold={0.3}
            onEndReached={() => fetchMore()}
          />
        </>
      ) : (
        <ZeroStateContainer>
          <NoPaymentsIcon />
          <Paragraph>No payments yet</Paragraph>
        </ZeroStateContainer>
      )}
    </>
  );
};
