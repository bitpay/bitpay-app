import React, {useLayoutEffect, useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {BillScreens, BillStackParamList} from '../BillStack';
import {H5, Paragraph} from '../../../../../components/styled/Text';
import styled from 'styled-components/native';
import Button from '../../../../../components/button/Button';
import {Linking, ScrollView, TouchableOpacity, View} from 'react-native';
import {
  LightBlack,
  LuckySevens,
  Slate30,
  SlateDark,
} from '../../../../../styles/colors';
import {
  BillOption,
  SectionContainer,
  SectionHeader,
} from '../../components/styled/ShopTabComponents';
import {formatFiatAmount, sleep} from '../../../../../utils/helper-methods';
import moment from 'moment';
import {useAppDispatch} from '../../../../../utils/hooks';
import Checkbox from '../../../../../components/checkbox/Checkbox';
import {
  ActiveOpacity,
  CtaContainerAbsolute,
  HeaderRightContainer,
} from '../../../../../components/styled/Containers';
import {SectionHeaderContainer} from '../../components/styled/ShopTabComponents';
import Settings from '../../../../../components/settings/Settings';
import OptionsSheet, {Option} from '../../../../wallet/components/OptionsSheet';
import {BillPayAccount} from '../../../../../store/shop/shop.models';
import {AppActions} from '../../../../../store/app';
import {CustomErrorMessage} from '../../../../wallet/components/ErrorMessages';
import {BillAccountPill} from '../components/BillAccountPill';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {getBillAccountEventParams} from '../utils';
import {ShopEffects} from '../../../../../store/shop';
import {startOnGoingProcessModal} from '../../../../../store/app/app.effects';
import {dismissOnGoingProcessModal} from '../../../../../store/app/app.actions';

const BillPayOption = styled.View<{hasBorderTop?: boolean}>`
  flex-direction: row;
  padding: 20px 0;
  ${({hasBorderTop}) => (hasBorderTop ? 'border-top-width: 1px;' : '')};
  border-bottom-width: 1px;
  border-color: ${({theme}) => (theme.dark ? LightBlack : Slate30)};
  align-items: center;
`;

const BillPayOptionAmount = styled(Paragraph)`
  font-size: 16px;
  font-weight: 600;
`;

const CheckboxContainer = styled.View`
  margin-right: 20px;
`;

const LineItemLabelContainer = styled.View`
  flex-grow: 1;
`;

const LineItemSublabel = styled(Paragraph)`
  font-size: 14px;
  color: ${({theme}) => (theme.dark ? LuckySevens : SlateDark)};
`;

const AmountSublabel = styled.View`
  padding: 7px 18px;
  border: 1px solid ${({theme}) => (theme.dark ? LightBlack : Slate30)};
  border-radius: 35px;
`;

const AmountSublabelText = styled(Paragraph)`
  font-size: 14px;
`;

const FooterButton = styled(CtaContainerAbsolute)`
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
  padding-bottom: 30px;
`;

const getCustomAmountSublabel = (account: BillPayAccount) => {
  return () => (
    <AmountSublabel>
      <AmountSublabelText>
        Current Balance:{' '}
        <AmountSublabelText style={{fontWeight: '500'}}>
          {formatFiatAmount(account[account.type].balance, 'USD', {
            customPrecision: 'minimal',
          })}
        </AmountSublabelText>
      </AmountSublabelText>
    </AmountSublabel>
  );
};

const PayBill = ({
  navigation,
  route,
}: NativeStackScreenProps<BillStackParamList, 'PayBill'>) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {account} = route.params;
  const [isOptionsSheetVisible, setIsOptionsSheetVisible] = useState(false);
  const [removingBill, setRemovingBill] = useState(false);

  const initialSelectedAmount = account[account.type].nextPaymentMinimumAmount
    ? 'nextPaymentMinimumAmount'
    : account[account.type].lastStatementBalance
    ? 'lastStatementBalance'
    : account[account.type].lastStatementBalance
    ? 'balance'
    : 'other';
  const [selectedAmount, setSelectedAmount] = useState(initialSelectedAmount);

  const baseEventParams = getBillAccountEventParams(account);

  const removeBill = async () => {
    setRemovingBill(true);
    dispatch(startOnGoingProcessModal('REMOVING_BILL'));
    await dispatch(ShopEffects.startHideBillPayAccount(account.id));
    await dispatch(ShopEffects.startGetBillPayAccounts());
    dispatch(dismissOnGoingProcessModal());
    navigation.pop();
    dispatch(Analytics.track('Bill Pay — Removed Bill', baseEventParams));
  };

  const sheetOptions: Array<Option> = [
    {
      onPress: () => {
        navigation.navigate(BillScreens.PAYMENTS, {
          account,
        });
        dispatch(
          Analytics.track(
            'Bill Pay — Viewed Bill Payment History',
            baseEventParams,
          ),
        );
      },
      optionElement: () => {
        return (
          <BillOption isLast={false}>
            <H5>{t('View Payment History')}</H5>
          </BillOption>
        );
      },
    },
    {
      onPress: async () => {
        removeBill().catch(async err => {
          dispatch(dismissOnGoingProcessModal());
          await sleep(500);
          dispatch(
            AppActions.showBottomNotificationModal(
              CustomErrorMessage({
                title: t('Could not remove bill'),
                errMsg: err?.message || t('Please try again later.'),
              }),
            ),
          );
          setRemovingBill(false);
        });
      },
      optionElement: () => {
        return (
          <BillOption isLast={false}>
            <H5>{t('Remove Bill')}</H5>
          </BillOption>
        );
      },
    },
    {
      onPress: () => {
        Linking.openURL('https://bitpay.com/request-help/wizard');
        dispatch(
          Analytics.track('Bill Pay — Clicked Contact Support', {
            ...baseEventParams,
            context: 'Pay Bill',
          }),
        );
      },
      optionElement: () => {
        return (
          <BillOption isLast={true}>
            <H5>{t('Contact Support')}</H5>
          </BillOption>
        );
      },
    },
  ];

  const onAmountScreenSubmit = (amount: number) => {
    const minAmount = 1;
    if (amount < minAmount) {
      dispatch(
        AppActions.showBottomNotificationModal(
          CustomErrorMessage({
            title: t('Below Minimum Amount'),
            errMsg: `The payment amount must be at least ${formatFiatAmount(
              minAmount,
              'USD',
              {
                customPrecision: 'minimal',
                currencyDisplay: 'symbol',
              },
            )}. Please modify your amount.`,
          }),
        ),
      );
      return;
    }
    dispatch(
      Analytics.track('Bill Pay — Submitted Custom Bill Amount', {
        ...baseEventParams,
        amount,
      }),
    );
    goToConfirmScreen(amount);
  };

  const goToConfirmScreen = async (amount: number) => {
    navigation.navigate(BillScreens.BILL_CONFIRM, {
      billPayments: [
        {
          amount,
          amountType: selectedAmount,
          billPayAccount: account,
        },
      ],
    });
  };

  const headerTitle = () => {
    return <BillAccountPill account={account} />;
  };

  const goToAmountScreen = () => {
    navigation.navigate(BillScreens.BILL_AMOUNT, {
      headerTitle,
      fiatCurrencyAbbreviation: 'USD',
      customAmountSublabel: getCustomAmountSublabel(account),
      onAmountSelected: submittedAmount =>
        onAmountScreenSubmit(+submittedAmount),
    });
  };

  const selectPaymentOption = (option: string) => {
    setSelectedAmount(option);
    dispatch(
      Analytics.track('Bill Pay — Selected Amount Type', {
        ...baseEventParams,
        amountType: option,
      }),
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: false,
      headerTitle,
      headerRight: () => {
        return (
          <>
            <HeaderRightContainer>
              <Settings
                onPress={() => {
                  setIsOptionsSheetVisible(true);
                }}
              />
            </HeaderRightContainer>
          </>
        );
      },
    });
  });
  return (
    <>
      <ScrollView>
        <SectionContainer style={{flexGrow: 1}}>
          <SectionHeaderContainer>
            <SectionHeader>{t('Select payment amount')}</SectionHeader>
          </SectionHeaderContainer>
          <View>
            {account[account.type].nextPaymentMinimumAmount ? (
              <TouchableOpacity
                activeOpacity={ActiveOpacity}
                onPress={() => selectPaymentOption('nextPaymentMinimumAmount')}>
                <BillPayOption hasBorderTop={true}>
                  <CheckboxContainer>
                    <Checkbox
                      checked={selectedAmount === 'nextPaymentMinimumAmount'}
                      radio={true}
                      onPress={() =>
                        selectPaymentOption('nextPaymentMinimumAmount')
                      }
                    />
                  </CheckboxContainer>
                  <LineItemLabelContainer>
                    <Paragraph>Minimum Payment Due</Paragraph>
                    {account[account.type].paddedNextPaymentDueDate ? (
                      <LineItemSublabel>
                        Due{' '}
                        {moment(
                          new Date(
                            account[account.type].paddedNextPaymentDueDate,
                          ),
                        )
                          .utc()
                          .format('MMMM D, YYYY')}
                      </LineItemSublabel>
                    ) : null}
                  </LineItemLabelContainer>
                  <BillPayOptionAmount>
                    {formatFiatAmount(
                      account[account.type].nextPaymentMinimumAmount,
                      'USD',
                      {customPrecision: 'minimal'},
                    )}
                  </BillPayOptionAmount>
                </BillPayOption>
              </TouchableOpacity>
            ) : null}
            {account[account.type].lastStatementBalance ? (
              <TouchableOpacity
                activeOpacity={ActiveOpacity}
                onPress={() => selectPaymentOption('lastStatementBalance')}>
                <BillPayOption>
                  <CheckboxContainer>
                    <Checkbox
                      checked={selectedAmount === 'lastStatementBalance'}
                      radio={true}
                      onPress={() =>
                        selectPaymentOption('lastStatementBalance')
                      }
                    />
                  </CheckboxContainer>
                  <LineItemLabelContainer>
                    <Paragraph>Last Statement Balance</Paragraph>
                  </LineItemLabelContainer>
                  <BillPayOptionAmount>
                    {formatFiatAmount(
                      account[account.type].lastStatementBalance!,
                      'USD',
                      {customPrecision: 'minimal'},
                    )}
                  </BillPayOptionAmount>
                </BillPayOption>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              activeOpacity={ActiveOpacity}
              onPress={() => selectPaymentOption('balance')}>
              <BillPayOption>
                <CheckboxContainer>
                  <Checkbox
                    checked={selectedAmount === 'balance'}
                    radio={true}
                    onPress={() => selectPaymentOption('balance')}
                  />
                </CheckboxContainer>
                <LineItemLabelContainer>
                  <Paragraph>Current Balance</Paragraph>
                </LineItemLabelContainer>
                <BillPayOptionAmount>
                  {formatFiatAmount(account[account.type].balance || 0, 'USD', {
                    customPrecision: 'minimal',
                  })}
                </BillPayOptionAmount>
              </BillPayOption>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={ActiveOpacity}
              onPress={() => selectPaymentOption('other')}>
              <BillPayOption>
                <CheckboxContainer>
                  <Checkbox
                    checked={selectedAmount === 'other'}
                    radio={true}
                    onPress={() => selectPaymentOption('other')}
                  />
                </CheckboxContainer>
                <LineItemLabelContainer>
                  <Paragraph>Other Amount</Paragraph>
                </LineItemLabelContainer>
              </BillPayOption>
            </TouchableOpacity>
            <LineItemSublabel style={{textAlign: 'right', marginTop: 10}}>
              {account[account.type].lastSuccessfulSync
                ? `Balance as of ${moment(
                    new Date(account[account.type].lastSuccessfulSync),
                  ).format('l, h:mm a')}`
                : 'Balance may be out of date'}
            </LineItemSublabel>
          </View>
        </SectionContainer>
      </ScrollView>
      <FooterButton
        background={true}
        style={{
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
        }}>
        <Button
          disabled={removingBill}
          onPress={() => {
            selectedAmount === 'other'
              ? goToAmountScreen()
              : onAmountScreenSubmit(
                  account[account.type][selectedAmount] as number,
                );
            dispatch(
              Analytics.track('Bill Pay — Submitted Amount Type', {
                ...baseEventParams,
                paymentOption: selectedAmount,
              }),
            );
          }}
          buttonStyle={'primary'}>
          {t('Continue')}
        </Button>
      </FooterButton>
      <OptionsSheet
        isVisible={isOptionsSheetVisible}
        closeModal={() => setIsOptionsSheetVisible(false)}
        options={sheetOptions}
        paddingHorizontal={0}
      />
    </>
  );
};

export default PayBill;
