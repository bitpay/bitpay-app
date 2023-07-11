import React, {useLayoutEffect, useState} from 'react';
import {StackScreenProps} from '@react-navigation/stack';
import {useTranslation} from 'react-i18next';
import {BillScreens, BillStackParamList} from '../BillStack';
import {
  H5,
  HeaderTitle,
  Paragraph,
} from '../../../../../components/styled/Text';
import styled from 'styled-components/native';
import Button from '../../../../../components/button/Button';
import {Linking, Platform, ScrollView, TouchableOpacity} from 'react-native';
import {
  LightBlack,
  Slate10,
  Slate30,
  SlateDark,
} from '../../../../../styles/colors';
import {
  BillOption,
  SectionContainer,
} from '../../components/styled/ShopTabComponents';
import {formatFiatAmount} from '../../../../../utils/helper-methods';
import moment from 'moment';
import {useAppDispatch} from '../../../../../utils/hooks';
import Checkbox from '../../../../../components/checkbox/Checkbox';
import {
  ActiveOpacity,
  CtaContainerAbsolute,
  HEIGHT,
  HeaderRightContainer,
} from '../../../../../components/styled/Containers';
import Settings from '../../../../../components/settings/Settings';
import OptionsSheet, {Option} from '../../../../wallet/components/OptionsSheet';
import {BillPayAccount} from '../../../../../store/shop/shop.models';
import {AppActions} from '../../../../../store/app';
import {CustomErrorMessage} from '../../../../wallet/components/ErrorMessages';
import {BillAccountPill} from '../components/BillAccountPill';
import BillItem from '../components/BillItem';

const AccountHeader = styled.View`
  padding: 0 16px 5px;
`;

const AccountContainer = styled.View`
  border: 1px solid ${({theme}) => (theme.dark ? LightBlack : Slate30)};
  border-radius: 12px;
  padding: 14px 0px 0px;
  margin-bottom: 16px;
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
  color: ${({theme}) => (theme.dark ? Slate30 : SlateDark)};
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

const PayAllBills = ({
  navigation,
  route,
}: StackScreenProps<BillStackParamList, 'PayAllBills'>) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const {accounts} = route.params;
  const [isOptionsSheetVisible, setIsOptionsSheetVisible] = useState(false);

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

  const onAmountScreenSubmit = (amount: number) => {
    const minAmount = 1;
    const maxAmount = account[account.type].balance;
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
    if (amount > maxAmount) {
      dispatch(
        AppActions.showBottomNotificationModal(
          CustomErrorMessage({
            title: t('Payment Limit Exceeded'),
            errMsg: `The payment amount is limited to ${formatFiatAmount(
              account[account.type].balance,
              'USD',
              {customPrecision: 'minimal', currencyDisplay: 'symbol'},
            )}. Please modify your amount.`,
          }),
        ),
      );
      return;
    }
    goToConfirmScreen(amount);
  };

  const goToConfirmScreen = async (amount: number) => {
    navigation.navigate(BillScreens.BILL_CONFIRM, {
      amount,
      billPayAccount: account,
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
      onAmountSelected: selectedAmount => onAmountScreenSubmit(+selectedAmount),
    });
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: false,
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
          minHeight: HEIGHT - (Platform.OS === 'android' ? 80 : 120),
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
                    <BillPayOption noBorder={true}>
                      <CheckboxContainer>
                        <Checkbox
                          radioHeight={25}
                          checkHeight={10}
                          checked={
                            accountsState[accountIndex].selectedAmountField ===
                            'nextPaymentMinimumAmount'
                          }
                          radio={true}
                          onPress={() =>
                            setAccountsState(
                              accountsState.map((accountState, index) =>
                                index === accountIndex
                                  ? {
                                      ...accountState,
                                      selectedAmountField:
                                        'nextPaymentMinimumAmount',
                                      selectedAmount:
                                        account[account.type]
                                          .nextPaymentMinimumAmount,
                                    }
                                  : accountState,
                              ),
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
                              account[account.type].paddedNextPaymentDueDate,
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
                  ) : null}
                  {account[account.type].lastStatementBalance ? (
                    <BillPayOption noBorder={true}>
                      <CheckboxContainer>
                        <Checkbox
                          radioHeight={25}
                          checkHeight={10}
                          checked={
                            accountsState[accountIndex].selectedAmountField ===
                            'lastStatementBalance'
                          }
                          radio={true}
                          onPress={() =>
                            setAccountsState(
                              accountsState.map((accountState, index) =>
                                index === accountIndex
                                  ? {
                                      ...accountState,
                                      selectedAmountField:
                                        'lastStatementBalance',
                                      selectedAmount:
                                        account[account.type]
                                          .lastStatementBalance!,
                                    }
                                  : accountState,
                              ),
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
                          {customPrecision: 'minimal'},
                        )}
                      </BillPayOptionAmount>
                    </BillPayOption>
                  ) : null}
                  {account[account.type].balance ? (
                    <BillPayOption noBorder={true}>
                      <CheckboxContainer>
                        <Checkbox
                          radioHeight={25}
                          checkHeight={10}
                          checked={
                            accountsState[accountIndex].selectedAmountField ===
                            'balance'
                          }
                          radio={true}
                          onPress={() =>
                            setAccountsState(
                              accountsState.map((accountState, index) =>
                                index === accountIndex
                                  ? {
                                      ...accountState,
                                      selectedAmountField: 'balance',
                                      selectedAmount:
                                        account[account.type].balance,
                                    }
                                  : accountState,
                              ),
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
                  ) : null}
                  <BillPayOption noBorder={true}>
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
                          setAccountsState(
                            accountsState.map((accountState, index) =>
                              index === accountIndex
                                ? {
                                    ...accountState,
                                    selectedAmountField: 'other',
                                    selectedAmount: 0,
                                  }
                                : accountState,
                            ),
                          )
                        }
                      />
                    </CheckboxContainer>
                    <LineItemLabelContainer>
                      <Paragraph>Other Amount</Paragraph>
                    </LineItemLabelContainer>
                  </BillPayOption>
                </BillPayOptions>
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
        }}>
        <Button
          onPress={() => console.log('pay')}
          buttonStyle={'primary'}
          height={50}>
          {`Pay ${formatFiatAmount(
            accountsState.reduce(
              (sum, accountState) => sum + accountState.selectedAmount,
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
    </>
  );
};

export default PayAllBills;
