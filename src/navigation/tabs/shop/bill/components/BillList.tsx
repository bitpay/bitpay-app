import React from 'react';
import moment from 'moment';
import {TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import {ActiveOpacity} from '../../../../../components/styled/Containers';
import BillItem from './BillItem';
import {
  BillPayAccount,
  BillPayPayment,
  BillPayment,
} from '../../../../../store/shop/shop.models';
import {AppActions} from '../../../../../store/app';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {getBillAccountEventParams} from '../utils';
import {startOnGoingProcessModal} from '../../../../../store/app/app.effects';
import {sleep} from '../../../../../utils/helper-methods';
import {ShopEffects} from '../../../../../store/shop';
import {dismissOnGoingProcessModal} from '../../../../../store/app/app.actions';
import {CustomErrorMessage} from '../../../../../navigation/wallet/components/ErrorMessages';

const sortByAscendingDate = (a: BillPayAccount, b: BillPayAccount) => {
  const farIntoTheFuture = moment().add(1, 'year').toDate();
  const fartherIntoTheFuture = moment().add(2, 'years').toDate();
  const evenFartherIntoTheFuture = moment().add(3, 'years').toDate();
  return (
    new Date(
      a.isPayable
        ? a[a.type].nextPaymentDueDate || farIntoTheFuture
        : a.paymentStatus === 'activating'
        ? fartherIntoTheFuture
        : evenFartherIntoTheFuture,
    ).getTime() -
    new Date(
      b.isPayable
        ? b[b.type].nextPaymentDueDate || farIntoTheFuture
        : b.paymentStatus === 'activating'
        ? fartherIntoTheFuture
        : evenFartherIntoTheFuture,
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
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const persistedBillPayPayments = useAppSelector(
    ({APP, SHOP}) => SHOP.billPayPayments[APP.network],
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

  const removeBill = async (account: BillPayAccount) => {
    await sleep(500);
    dispatch(startOnGoingProcessModal('REMOVING_BILL'));
    if (account) {
      await dispatch(ShopEffects.startHideBillPayAccount(account.id));
    }
    await dispatch(ShopEffects.startGetBillPayAccounts());
    dispatch(dismissOnGoingProcessModal());
    dispatch(
      Analytics.track(
        'Bill Pay - Removed Bill',
        getBillAccountEventParams(account),
      ),
    );
  };

  return (
    <>
      {accountsWithPayments.sort(sortByAscendingDate).map((account, index) => {
        return (
          <TouchableOpacity
            key={index}
            activeOpacity={account.isPayable ? ActiveOpacity : 1}
            onPress={() => {
              if (!account.isPayable) {
                if (account.paymentStatus === 'activating') {
                  dispatch(
                    AppActions.showBottomNotificationModal({
                      type: 'info',
                      title: t('Why is my bill connecting?'),
                      message: t(
                        'Account verification and connections can take up to 3-5 business days. Please check back soon.',
                      ),
                      enableBackdropDismiss: true,
                      onBackdropDismiss: () => {},
                      actions: [
                        {
                          text: t('Close'),
                          action: () => {},
                          primary: true,
                        },
                        {
                          text: t('REMOVE BILL'),
                          action: () => {
                            removeBill(account).catch(async err => {
                              dispatch(dismissOnGoingProcessModal());
                              await sleep(500);
                              dispatch(
                                AppActions.showBottomNotificationModal(
                                  CustomErrorMessage({
                                    title: t('Could not remove bill'),
                                    errMsg:
                                      err?.message ||
                                      t('Please try again later.'),
                                  }),
                                ),
                              );
                            });
                          },
                        },
                      ],
                    }),
                  );
                  dispatch(
                    Analytics.track(
                      'Bill Pay - Viewed Why Is My Bill Connecting',
                      getBillAccountEventParams(account),
                    ),
                  );
                }
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
