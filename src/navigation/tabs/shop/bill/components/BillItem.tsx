import React from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useTranslation} from 'react-i18next';
import {BaseText, H6, Paragraph} from '../../../../../components/styled/Text';
import {
  Action,
  LightBlack,
  LuckySevens,
  Slate10,
  Slate30,
  SlateDark,
  White,
} from '../../../../../styles/colors';
import {formatFiatAmount, sleep} from '../../../../../utils/helper-methods';
import BillStatus from './BillStatus';
import {
  BillPayAccount,
  BillPayment,
} from '../../../../../store/shop/shop.models';
import ChevronDownSvg from '../../../../../../assets/img/bills/chevron-down.svg';
import ChevronUpSvg from '../../../../../../assets/img/bills/chevron-up.svg';
import {ActiveOpacity} from '../../../../../components/styled/Containers';
import {useAppDispatch} from '../../../../../utils/hooks';
import {AppActions} from '../../../../../store/app';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {ShopEffects} from '../../../../../store/shop';
import {getBillAccountEventParams} from '../utils';
import {CustomErrorMessage} from '../../../../wallet/components/ErrorMessages';
import {InfoSvg} from '../../components/svg/ShopTabSvgs';
import {useTheme} from '../../../../../contexts';
import {useOngoingProcess} from '../../../../../contexts';

export interface BillItemProps {
  account?: BillPayAccount;
  payment?: BillPayment;
  variation: 'small' | 'large' | 'header' | 'pay';
  expanded?: boolean;
  selectedAmount?: number;
}

const styles = StyleSheet.create({
  itemContainer: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  accountType: {
    fontSize: 14,
    marginTop: -5,
  },
  accountDetailsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    flexShrink: 1,
  },
  accountBody: {
    flexDirection: 'row',
  },
  accountActions: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payButton: {
    height: 32,
    backgroundColor: Action,
    borderRadius: 50,
    maxWidth: 90,
    minWidth: 50,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    fontSize: 14,
    color: White,
  },
  selectedAmountContainer: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 9,
  },
  accountFooter: {
    flexDirection: 'row',
    marginTop: 13,
    paddingVertical: 2,
    paddingHorizontal: 15,
    borderBottomRightRadius: 6,
    borderBottomLeftRadius: 6,
  },
  accountFooterText: {
    fontSize: 12,
    flexGrow: 1,
  },
  accountFooterActionText: {
    textAlign: 'right',
  },
  connectingStatusContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
});

const ItemContainer = ({
  variation,
  style,
  ...rest
}: Partial<BillItemProps> & React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  const isHeader = variation === 'header';
  const pad = variation === 'large' ? 16 : 12;
  return (
    <View
      style={[
        styles.itemContainer,
        {borderColor: theme.dark ? LightBlack : Slate30},
        isHeader
          ? {borderWidth: 0, marginLeft: 0}
          : {
              paddingLeft: pad,
              paddingBottom: pad,
              paddingTop: pad,
              paddingRight: pad,
            },
        style,
      ]}
      {...rest}
    />
  );
};

const AccountType = ({
  style,
  ...rest
}: React.ComponentProps<typeof Paragraph>) => {
  const theme = useTheme();
  return (
    <Paragraph
      style={[
        styles.accountType,
        {color: theme.dark ? LuckySevens : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const AccountDetailsLeft = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.accountDetailsLeft, style]} {...rest} />
);

const AccountDetailsRight = ({
  variation,
  style,
  ...rest
}: Partial<BillItemProps> & React.ComponentProps<typeof View>) => (
  <View
    style={[
      variation === 'header' || variation === 'pay'
        ? {alignItems: 'center' as const, flexDirection: 'row' as const}
        : {alignItems: 'flex-end' as const},
      style,
    ]}
    {...rest}
  />
);

const AccountBody = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.accountBody, style]} {...rest} />
);

const AccountActions = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.accountActions, style]} {...rest} />
);

const PayButton = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.payButton, style]} {...rest} />
);

const PayButtonText = ({
  style,
  ...rest
}: React.ComponentProps<typeof Paragraph>) => (
  <Paragraph style={[styles.payButtonText, style]} {...rest} />
);

const SelectedAmountContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.selectedAmountContainer,
        {backgroundColor: theme.dark ? LightBlack : Slate10},
        style,
      ]}
      {...rest}
    />
  );
};

const AccountBalance = ({
  variation,
  style,
  ...rest
}: Partial<BillItemProps> & React.ComponentProps<typeof BaseText>) => (
  <BaseText
    style={[
      {
        fontSize: 16,
        marginBottom: variation === 'large' ? -1 : 3,
      },
      style,
    ]}
    {...rest}
  />
);

const AccountFooter = ({
  variation,
  style,
  ...rest
}: Partial<BillItemProps> & React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  const margin = variation === 'large' ? -16 : -12;
  return (
    <View
      style={[
        styles.accountFooter,
        {backgroundColor: theme.dark ? LightBlack : Slate10},
        {marginLeft: margin, marginRight: margin, marginBottom: margin},
        style,
      ]}
      {...rest}
    />
  );
};

const AccountFooterText = ({
  style,
  ...rest
}: React.ComponentProps<typeof Paragraph>) => {
  const theme = useTheme();
  return (
    <Paragraph
      style={[
        styles.accountFooterText,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const AccountFooterActionText = ({
  style,
  ...rest
}: React.ComponentProps<typeof Paragraph>) => {
  const theme = useTheme();
  return (
    <AccountFooterText
      style={[
        styles.accountFooterActionText,
        {
          color: theme.dark ? White : Action,
          fontWeight: theme.dark ? '500' : '400',
        },
        style,
      ]}
      {...rest}
    />
  );
};

const ConnectingStatusContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.connectingStatusContainer, style]} {...rest} />
);

export default ({
  account,
  payment,
  variation,
  expanded,
  selectedAmount,
}: BillItemProps) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const theme = useTheme();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();

  const baseEventParams = getBillAccountEventParams(account, payment);

  const removeBill = async () => {
    await sleep(500);
    showOngoingProcess('REMOVING_BILL');
    if (account) {
      await dispatch(ShopEffects.startHideBillPayAccount(account.id));
    }
    await dispatch(ShopEffects.startGetBillPayAccounts());
    hideOngoingProcess();
    dispatch(Analytics.track('Bill Pay - Removed Bill', baseEventParams));
  };

  return (
    <ItemContainer variation={variation}>
      <AccountBody>
        <AccountDetailsLeft>
          <Image
            style={{
              height: 30,
              width: 30,
              marginRight: 10,
              marginTop: -4,
              borderRadius: 30,
            }}
            resizeMode={'contain'}
            source={{
              uri:
                payment?.icon ||
                (account && account[account.type].merchantIcon),
            }}
          />
          <View style={{maxWidth: 175}}>
            <H6 numberOfLines={1}>
              {payment?.merchantName ||
                (account && account[account.type].merchantName)}
            </H6>
            <AccountType numberOfLines={1}>
              {payment?.accountDescription ||
                (account && account[account.type].description)}
            </AccountType>
          </View>
        </AccountDetailsLeft>
        <AccountDetailsRight variation={variation}>
          {variation === 'header' ? (
            <>
              {selectedAmount ? (
                <SelectedAmountContainer>
                  <H6>{formatFiatAmount(selectedAmount, 'USD')}</H6>
                </SelectedAmountContainer>
              ) : null}
              {expanded ? <ChevronDownSvg /> : <ChevronUpSvg />}
            </>
          ) : (
            <>
              {!!payment || account?.isPayable ? (
                <>
                  {variation === 'pay' ? (
                    <PayButton>
                      <PayButtonText>{t('Pay Bill')}</PayButtonText>
                    </PayButton>
                  ) : (
                    <>
                      <AccountBalance variation={variation}>
                        {formatFiatAmount(
                          payment
                            ? payment.amount
                            : (account && account[account.type].balance) || 0,
                          'USD',
                        )}
                      </AccountBalance>
                      {variation === 'small' && account ? (
                        <BillStatus account={account} payment={payment} />
                      ) : null}
                    </>
                  )}
                </>
              ) : account?.paymentStatus === 'activating' ? (
                <ConnectingStatusContainer>
                  <InfoSvg theme={theme} />
                  <BillStatus account={account} payment={payment} />
                </ConnectingStatusContainer>
              ) : null}
            </>
          )}
        </AccountDetailsRight>
      </AccountBody>
      {variation === 'large' || variation === 'pay' ? (
        account && account.isPayable && variation === 'large' ? (
          <AccountActions>
            <BillStatus account={account} payment={payment} />
            <PayButton>
              <PayButtonText>{t('Pay Bill')}</PayButtonText>
            </PayButton>
          </AccountActions>
        ) : (
          <>
            {account &&
            !account.isPayable &&
            account.paymentStatus !== 'activating' ? (
              <AccountFooter variation={variation}>
                <AccountFooterText>Unable to pay bill</AccountFooterText>
                <TouchableOpacity
                  activeOpacity={ActiveOpacity}
                  onPress={() => {
                    dispatch(
                      AppActions.showBottomNotificationModal({
                        type: 'error',
                        title: t('Unable to pay bill'),
                        message: t(
                          'We are currently unable to process payments for this bill. We are actively working on a solution.',
                        ),
                        enableBackdropDismiss: true,
                        onBackdropDismiss: () => {},
                        actions: [
                          {
                            text: t('OK'),
                            action: () => {},
                            primary: true,
                          },
                          {
                            text: t('REMOVE BILL'),
                            action: () => {
                              removeBill().catch(async err => {
                                hideOngoingProcess();
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
                        'Bill Pay - Clicked Unable To Pay Bill Learn More',
                        baseEventParams,
                      ),
                    );
                  }}>
                  <AccountFooterActionText>Learn More</AccountFooterActionText>
                </TouchableOpacity>
              </AccountFooter>
            ) : null}
          </>
        )
      ) : null}
    </ItemContainer>
  );
};
