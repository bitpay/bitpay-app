import React, {useLayoutEffect, useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {BillScreens, BillGroupParamList} from '../BillGroup';
import {
  H5,
  HeaderTitle,
  Paragraph,
} from '../../../../../components/styled/Text';
import styled from 'styled-components/native';
import Button from '../../../../../components/button/Button';
import {Linking, ScrollView} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {
  LightBlack,
  LuckySevens,
  Slate10,
  Slate30,
  SlateDark,
  White,
} from '../../../../../styles/colors';
import {
  BillOption,
  Field,
  FieldValue,
  SectionContainer,
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
import Settings from '../../../../../components/settings/Settings';
import OptionsSheet, {Option} from '../../../../wallet/components/OptionsSheet';
import {BillPayAccount} from '../../../../../store/shop/shop.models';
import {AppActions} from '../../../../../store/app';
import {CustomErrorMessage} from '../../../../wallet/components/ErrorMessages';
import BillItem, {BillItemProps} from '../components/BillItem';
import AmountModal from '../../../../../components/amount/AmountModal';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {getBillAccountEventParams} from '../utils';

const AccountHeader = styled.View`
  padding: 0 16px 5px;
`;

const AccountContainer = styled.View`
  border: 1px solid ${({theme}) => (theme.dark ? LightBlack : Slate30)};
  border-radius: 12px;
  padding: 14px 0px 0px;
  margin-bottom: 16px;
  overflow: hidden;
`;

const BillPayOptions = styled.View`
  border-top-width: 1px;
  border-color: ${({theme}) => (theme.dark ? LightBlack : Slate10)};
  padding: 0 16px 8px;
`;

const BillPayOption = styled.View<{hasBorderTop?: boolean; noBorder?: boolean}>`
  flex-direction: row;
  padding: ${({noBorder}) => (noBorder ? 15 : 20)}px 0;
  ${({hasBorderTop, noBorder}) =>
    hasBorderTop && !noBorder ? 'border-top-width: 1px;' : ''};
  ${({noBorder}) => (!noBorder ? 'border-bottom-width: 1px;' : '')};
  border-color: ${({theme}) => (theme.dark ? LightBlack : Slate30)};
  align-items: center;
`;

const BillPayOptionAmount = styled(Paragraph)`
  font-size: 16px;
  font-weight: 600;
`;

const CheckboxContainer = styled.View`
  margin-right: 15px;
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

const AccountFooter = styled.View<Partial<BillItemProps>>`
  background-color: ${({theme}) => (theme.dark ? LightBlack : Slate10)};
  flex-direction: row;
  padding: 2px 15px;
  border-bottom-right-radius: 6px;
  border-bottom-left-radius: 6px;
`;

const AccountFooterText = styled(Paragraph)`
  color: ${SlateDark};
  color: ${({theme}) => (theme.dark ? White : SlateDark)};
  font-size: 12px;
  flex-grow: 1;
  text-align: center;
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

const PayAllBills = ({
  navigation,
  route,
}: NativeStackScreenProps<BillGroupParamList, 'PayAllBills'>) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const {accounts: allAccounts} = route.params;
  const accounts = allAccounts.filter(acct => acct.isPayable);
  const [isOptionsSheetVisible, setIsOptionsSheetVisible] = useState(false);
  const [amountModalVisible, setAmountModalVisible] = useState(false);
  const [amountModalAccountAndIndex, setAmountModalAccountAndIndex] = useState({
    account: accounts[0],
    accountIndex: 0,
  });

  const [accountsState, setAccountsState] = useState(
    accounts.map((acct, index) => ({
      expanded: index === 0,
      selectedAmount:
        index === 0 ? acct[acct.type].nextPaymentMinimumAmount : 0,
      selectedAmountField: index === 0 ? 'nextPaymentMinimumAmount' : 'none',
    })),
  );

  const sheetOptions: Array<Option> = [
    {
      onPress: () => Linking.openURL('https://bitpay.com/request-help/wizard'),
      optionElement: () => {
        return (
          <BillOption isLast={true}>
            <H5>{t('Contact Support')}</H5>
          </BillOption>
        );
      },
    },
  ];

  const goToConfirmScreen = async () => {
    const billPayments = accounts
      .map((billPayAccount, index) => ({
        billPayAccount,
        amount: accountsState[index].selectedAmount,
        amountType: accountsState[index].selectedAmountField,
      }))
      .filter(payment => !!payment.amount);
    if (!billPayments.length) {
      return;
    }
    navigation.navigate(BillScreens.BILL_CONFIRM, {
      billPayments,
    });
  };

  const onEnteredAmount = async (amount: number) => {
    setAmountModalVisible(false);
    await sleep(600);
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
      Analytics.track('Bill Pay - Submitted Custom Bill Amount', {
        ...getBillAccountEventParams(amountModalAccountAndIndex.account),
        amount,
      }),
    );
    selectPaymentOption(
      amountModalAccountAndIndex.account,
      amountModalAccountAndIndex.accountIndex,
      'other',
      amount,
    );
  };

  const selectPaymentOption = (
    account: BillPayAccount,
    accountIndex: number,
    paymentOption:
      | 'nextPaymentMinimumAmount'
      | 'lastStatementBalance'
      | 'balance'
      | 'other',
    customAmount?: number,
  ) => {
    if (
      paymentOption === 'other' &&
      accountsState[accountIndex].selectedAmountField !== 'other' &&
      !customAmount
    ) {
      setAmountModalVisible(true);
      setAmountModalAccountAndIndex({account, accountIndex});
      return;
    }
    setAccountsState(
      accountsState.map((accountState, index) => {
        const nextPaymentOption =
          accountState.selectedAmountField === paymentOption && !customAmount
            ? 'none'
            : paymentOption;
        return index === accountIndex
          ? {
              ...accountState,
              selectedAmountField: nextPaymentOption,
              selectedAmount: nextPaymentOption
                ? customAmount || account[account.type][nextPaymentOption]
                : 0,
            }
          : accountState;
      }),
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => {
        return <HeaderTitle>{t('Pay All Bills')}</HeaderTitle>;
      },
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
      <ScrollView
        contentContainerStyle={{
          paddingTop: 30,
          paddingBottom: 100,
        }}>
        <SectionContainer
          style={{flexGrow: 1, paddingLeft: 15, paddingRight: 15}}>
          {accounts.map((account, accountIndex) => (
            <AccountContainer key={accountIndex}>
              <TouchableOpacity
                activeOpacity={ActiveOpacity}
                onPress={() => {
                  setAccountsState(
                    accountsState.map((accountState, index) => ({
                      ...accountState,
                      expanded:
                        index === accountIndex
                          ? !accountState.expanded
                          : accountState.expanded,
                    })),
                  );
                }}>
                <AccountHeader>
                  <BillItem
                    account={account}
                    variation={'header'}
                    expanded={accountsState[accountIndex].expanded}
                    selectedAmount={accountsState[accountIndex].selectedAmount}
                  />
                </AccountHeader>
              </TouchableOpacity>
              {accountsState[accountIndex].expanded ? (
                <BillPayOptions>
                  {account[account.type].nextPaymentMinimumAmount ? (
                    <TouchableOpacity
                      activeOpacity={ActiveOpacity}
                      onPress={() =>
                        selectPaymentOption(
                          account,
                          accountIndex,
                          'nextPaymentMinimumAmount',
                        )
                      }>
                      <BillPayOption noBorder={true}>
                        <CheckboxContainer>
                          <Checkbox
                            radioHeight={25}
                            checkHeight={10}
                            checked={
                              accountsState[accountIndex]
                                .selectedAmountField ===
                              'nextPaymentMinimumAmount'
                            }
                            radio={true}
                            onPress={() =>
                              selectPaymentOption(
                                account,
                                accountIndex,
                                'nextPaymentMinimumAmount',
                              )
                            }
                          />
                        </CheckboxContainer>
                        <LineItemLabelContainer>
                          <Paragraph>Minimum Payment Due</Paragraph>
                          <LineItemSublabel>
                            Due{' '}
                            {moment(
                              new Date(
                                account[account.type].paddedNextPaymentDueDate!,
                              ),
                            )
                              .utc()
                              .format('MMMM D, YYYY')}
                          </LineItemSublabel>
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
                      onPress={() => {
                        selectPaymentOption(
                          account,
                          accountIndex,
                          'lastStatementBalance',
                        );
                      }}>
                      <BillPayOption noBorder={true}>
                        <CheckboxContainer>
                          <Checkbox
                            radioHeight={25}
                            checkHeight={10}
                            checked={
                              accountsState[accountIndex]
                                .selectedAmountField === 'lastStatementBalance'
                            }
                            radio={true}
                            onPress={() =>
                              selectPaymentOption(
                                account,
                                accountIndex,
                                'lastStatementBalance',
                              )
                            }
                          />
                        </CheckboxContainer>
                        <LineItemLabelContainer>
                          <Paragraph>Last statement balance</Paragraph>
                        </LineItemLabelContainer>
                        <BillPayOptionAmount>
                          {formatFiatAmount(
                            account[account.type].lastStatementBalance!,
                            'USD',
                            {
                              customPrecision: 'minimal',
                            },
                          )}
                        </BillPayOptionAmount>
                      </BillPayOption>
                    </TouchableOpacity>
                  ) : null}
                  {account[account.type].balance ? (
                    <TouchableOpacity
                      activeOpacity={ActiveOpacity}
                      onPress={() =>
                        selectPaymentOption(account, accountIndex, 'balance')
                      }>
                      <BillPayOption noBorder={true}>
                        <CheckboxContainer>
                          <Checkbox
                            radioHeight={25}
                            checkHeight={10}
                            checked={
                              accountsState[accountIndex]
                                .selectedAmountField === 'balance'
                            }
                            radio={true}
                            onPress={() =>
                              selectPaymentOption(
                                account,
                                accountIndex,
                                'balance',
                              )
                            }
                          />
                        </CheckboxContainer>
                        <LineItemLabelContainer>
                          <Paragraph>Current Balance</Paragraph>
                        </LineItemLabelContainer>
                        <BillPayOptionAmount>
                          {formatFiatAmount(
                            account[account.type].balance,
                            'USD',
                            {
                              customPrecision: 'minimal',
                            },
                          )}
                        </BillPayOptionAmount>
                      </BillPayOption>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    activeOpacity={ActiveOpacity}
                    onPress={() =>
                      selectPaymentOption(account, accountIndex, 'other')
                    }>
                    <BillPayOption noBorder={true} style={{paddingTop: 4}}>
                      <CheckboxContainer>
                        <Checkbox
                          radioHeight={25}
                          checkHeight={10}
                          checked={
                            accountsState[accountIndex].selectedAmountField ===
                            'other'
                          }
                          radio={true}
                          onPress={() =>
                            selectPaymentOption(account, accountIndex, 'other')
                          }
                        />
                      </CheckboxContainer>
                      <LineItemLabelContainer>
                        <Paragraph>
                          {account[account.type].balance ||
                          account[account.type].lastStatementBalance ||
                          account[account.type].nextPaymentMinimumAmount
                            ? 'Other Amount'
                            : 'Amount'}
                        </Paragraph>
                      </LineItemLabelContainer>
                      <Field
                        style={{
                          height: 20,
                          minWidth: 100,
                        }}>
                        <FieldValue style={{textAlign: 'right'}}>
                          {accountsState[accountIndex].selectedAmountField ===
                            'other' &&
                          accountsState[accountIndex].selectedAmount
                            ? formatFiatAmount(
                                accountsState[accountIndex].selectedAmount,
                                'USD',
                                {customPrecision: 'minimal'},
                              )
                            : ''}
                        </FieldValue>
                      </Field>
                    </BillPayOption>
                  </TouchableOpacity>
                </BillPayOptions>
              ) : null}
              {accountsState[accountIndex].expanded ? (
                <AccountFooter>
                  <AccountFooterText>
                    {account[account.type].lastSuccessfulSync
                      ? `Balance as of ${moment(
                          new Date(account[account.type].lastSuccessfulSync!),
                        ).format('l, h:mm a')}`
                      : 'Balance may be out of date'}
                  </AccountFooterText>
                </AccountFooter>
              ) : null}
            </AccountContainer>
          ))}
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
          marginBottom: -10,
        }}>
        <Button
          onPress={() => goToConfirmScreen()}
          buttonStyle={'primary'}
          height={50}>
          {`Pay ${formatFiatAmount(
            accountsState.reduce(
              (sum, accountState) =>
                accountState.selectedAmount
                  ? sum + accountState.selectedAmount
                  : sum,
              0,
            ),
            'USD',
          )}`}
        </Button>
      </FooterButton>
      <OptionsSheet
        isVisible={isOptionsSheetVisible}
        closeModal={() => setIsOptionsSheetVisible(false)}
        options={sheetOptions}
        paddingHorizontal={0}
      />

      <AmountModal
        isVisible={amountModalVisible}
        customAmountSublabel={getCustomAmountSublabel(
          amountModalAccountAndIndex.account,
        )}
        fiatCurrencyAbbreviation={'USD'}
        onClose={() => setAmountModalVisible(false)}
        onSubmit={amt => onEnteredAmount(amt)}
      />
    </>
  );
};

export default PayAllBills;
