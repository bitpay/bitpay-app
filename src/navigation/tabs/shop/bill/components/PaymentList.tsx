import React, {useCallback, useEffect, useState} from 'react';
import styled from 'styled-components/native';
import {useTheme} from 'styled-components/native';
import {useTranslation} from 'react-i18next';
import {FlashList} from '@shopify/flash-list';
import {ActiveOpacity} from '../../../../../components/styled/Containers';
import NoPaymentsSvg from '../../../../../../assets/img/bills/no-payments.svg';
import BillItem from './BillItem';
import {
  BillPayAccount,
  BillPayPayment,
  BillPayment,
} from '../../../../../store/shop/shop.models';
import {Paragraph} from '../../../../../components/styled/Text';
import {
  LightBlack,
  Slate30,
  SlateDark,
  White,
} from '../../../../../styles/colors';
import {RefreshControl, ScrollView} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {ShopEffects} from '../../../../../store/shop';
import {AppActions} from '../../../../../store/app';
import {CustomErrorMessage} from '../../../../wallet/components/ErrorMessages';

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
  account,
  accounts,
  variation,
  onPress,
}: {
  account?: BillPayAccount;
  accounts: BillPayAccount[];
  variation: 'large' | 'small';
  onPress: (account: BillPayAccount, payment: BillPayment) => void;
}) => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const {t} = useTranslation();
  const persistedBillPayPayments = useAppSelector(
    ({APP, SHOP}) => SHOP.billPayPayments[APP.network],
  ) as BillPayPayment[];
  const billPayPayments = persistedBillPayPayments.sort(sortByDescendingDate);
  const [payments, setPayments] = useState(billPayPayments);
  const [refreshing, setRefreshing] = useState(false);
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
  const displayablePayments = allPayments.filter(payment =>
    account
      ? account.id === payment.partnerAccountId
      : accounts.find(acc => acc.id === payment.partnerAccountId) ||
        (payment.icon &&
          payment.accountDescription &&
          payment.merchantName &&
          payment.accountType),
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

  const getPayments = useCallback(async () => {
    try {
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
    } catch (err: any) {
      dispatch(
        AppActions.showBottomNotificationModal(
          CustomErrorMessage({
            title: t('Unable to fetch payments'),
            errMsg:
              err?.message ||
              t(
                'Unable to refresh bill payment history. Please try again later.',
              ),
          }),
        ),
      );
    }
  }, [account, billPayPaymentIds, billPayPayments, dispatch, t]);

  const fetchMore = async () => {
    const lastPayment = displayablePayments[displayablePayments.length - 1];
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
    getPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Refresher = (
    <RefreshControl
      tintColor={theme.dark ? White : SlateDark}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await getPayments();
        setRefreshing(false);
      }}
    />
  );

  return (
    <>
      {displayablePayments.length ? (
        <FlashList
          refreshControl={Refresher}
          contentContainerStyle={{paddingBottom: 200}}
          data={displayablePayments}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          estimatedItemSize={88}
          onEndReachedThreshold={0.3}
          onEndReached={() => fetchMore()}
        />
      ) : (
        <ScrollView refreshControl={Refresher}>
          <ZeroStateContainer>
            <NoPaymentsIcon />
            <Paragraph>No payments yet</Paragraph>
          </ZeroStateContainer>
        </ScrollView>
      )}
    </>
  );
};
