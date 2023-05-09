import {useNavigation, useTheme} from '@react-navigation/native';
import {StackScreenProps} from '@react-navigation/stack';
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
  useMount,
} from '../../../utils/hooks';
import styled from 'styled-components/native';
import {RefreshControl, SectionList, View} from 'react-native';
import {find} from 'lodash';
import moment from 'moment';
import {
  getCurrencyAbbreviation,
  getProtocolName,
  sleep,
} from '../../../utils/helper-methods';
import {formatFiatAmount, shouldScale} from '../../../utils/helper-methods';
import {ScreenGutter} from '../../../components/styled/Containers';
import {BaseText, Balance, H5} from '../../../components/styled/Text';
import {
  Air,
  LightBlack,
  LuckySevens,
  SlateDark,
  White,
} from '../../../styles/colors';
import GhostSvg from '../../../../assets/img/ghost-straight-face.svg';
import WalletTransactionSkeletonRow from '../../../components/list/WalletTransactionSkeletonRow';
import LinkingButtons from '../../tabs/home/components/LinkingButtons';
import TransactionRow from '../../../components/list/TransactionRow';

import {CoinbaseStackParamList} from '../CoinbaseStack';
import {
  CoinbaseErrorsProps,
  CoinbaseTransactionProps,
} from '../../../api/coinbase/coinbase.types';
import CoinbaseIcon from '../components/CoinbaseIcon';
import {
  coinbaseParseErrorToString,
  coinbaseCreateAddress,
  coinbaseGetAccountsAndBalance,
  coinbaseGetTransactionsByAccount,
  coinbaseGetFiatAmount,
} from '../../../store/coinbase';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import {
  ToCashAddress,
  TranslateToBchCashAddress,
} from '../../../store/wallet/effects/address/address';
import AmountModal from '../../../components/amount/AmountModal';
import {Wallet} from '../../../store/wallet/wallet.models';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import Icons from '../../wallet/components/WalletIcons';
import {
  BitpaySupportedUtxoCoins,
  OtherBitpaySupportedCoins,
} from '../../../constants/currencies';
import {IsValidBitcoinCashAddress} from '../../../store/wallet/utils/validations';
import ToWalletSelectorModal, {
  ToWalletSelectorCustomCurrency,
} from '../../services/components/ToWalletSelectorModal';
import {
  addWallet,
  AddWalletData,
  getDecryptPassword,
} from '../../../store/wallet/effects';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import {RootState} from '../../../store';
import {WrongPasswordError} from '../../wallet/components/ErrorMessages';
import {showWalletError} from '../../../store/wallet/effects/errors/errors';
import {GroupCoinbaseTransactions} from '../../../store/wallet/effects/transactions/transactions';
import {Analytics} from '../../../store/analytics/analytics.effects';

const AccountContainer = styled.View`
  flex: 1;
`;

const Row = styled.View`
  align-items: center;
`;

const BalanceContainer = styled.View`
  margin: 20px 0;
  padding: 0 15px 10px;
`;

const HeaderSubTitleContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const TypeContainer = styled(HeaderSubTitleContainer)`
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : '#E1E4E7')};
  padding: 2px 5px;
  border-radius: 3px;
  margin-top: 5px;
  margin-bottom: 10px;
`;

const TypeText = styled(BaseText)`
  font-size: 12px;
  color: ${({theme: {dark}}) => (dark ? LuckySevens : SlateDark)};
`;

const Type = styled(BaseText)`
  font-size: 12px;
  color: ${({theme: {dark}}) => (dark ? LuckySevens : SlateDark)};
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : '#E1E4E7')};
  padding: 2px 5px;
  border-radius: 3px;
  margin-top: 5px;
  margin-bottom: 10px;
`;

const TransactionListHeader = styled.View`
  padding: 10px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : '#F5F6F7')};
`;

const BorderBottom = styled.View`
  border-bottom-width: 1px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : Air)};
`;

const EmptyListContainer = styled.View`
  justify-content: space-between;
  align-items: center;
  margin-top: 50px;
`;

const SkeletonContainer = styled.View`
  margin-bottom: 20px;
`;

const TransactionSectionHeaderContainer = styled.View`
  padding: ${ScreenGutter};
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : '#F5F6F7')};
  height: 55px;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const IconContainer = styled.View`
  margin-right: 5px;
`;

export const WalletSelectMenuContainer = styled.View`
  padding: ${ScreenGutter};
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  max-height: 75%;
`;

export const WalletSelectMenuHeaderContainer = styled.View`
  padding: 50px 0;
`;

export type CoinbaseAccountScreenParamList = {
  accountId: string;
  refresh?: boolean;
};

const CoinbaseAccount = ({
  route,
}: StackScreenProps<CoinbaseStackParamList, 'CoinbaseAccount'>) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {accountId, refresh} = route.params;
  const logger = useLogger();
  const tokenData = useAppSelector(({WALLET}: RootState) => WALLET.tokenData);
  const allKeys = useAppSelector(({WALLET}: RootState) => WALLET.keys);

  const [refreshing, setRefreshing] = useState(false);
  const [customSupportedCurrencies, setCustomSupportedCurrencies] = useState(
    [] as ToWalletSelectorCustomCurrency[],
  );
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [amountModalVisible, setAmountModalVisible] = useState(false);
  const [fiatAmount, setFiatAmount] = useState(0);
  const [cryptoAmount, setCryptoAmount] = useState('0');
  const [groupedTransactions, setGroupedTransactions] = useState<
    {title: string; data: CoinbaseTransactionProps[]}[]
  >([]);

  const keys = useAppSelector(({WALLET}) => WALLET.keys);

  const [availableWalletToDeposit, setAvailableWalletToDeposit] =
    useState(false);
  const [availableWalletToWithdraw, setAvailableWalletToWithdraw] =
    useState(false);

  const [selectedWallet, setSelectedWallet] = useState<Wallet>();

  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const exchangeRates = useAppSelector(({COINBASE}) => COINBASE.exchangeRates);
  const transactions = useAppSelector(
    ({COINBASE}) => COINBASE.transactions[COINBASE_ENV],
  );
  const account = useAppSelector(({COINBASE}) => {
    return find(COINBASE.accounts[COINBASE_ENV], {id: accountId});
  });

  const txsStatus = useAppSelector(
    ({COINBASE}) => COINBASE.getTransactionsStatus,
  );

  const txsLoading = useAppSelector(({COINBASE}) => COINBASE.isApiLoading);

  const [nextStartingAfter, setNextStartingAfter] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(txsLoading);
  const [errorLoadingTxs, setErrorLoadingTxs] = useState<boolean>();
  const [initialLoad, setInitialLoad] = useState<boolean>(true);
  useEffect(() => {
    navigation.setOptions({
      headerTitle: account?.name,
    });
  }, [navigation, account]);

  const parseTime = (timestamp?: string) => {
    return timestamp ? moment(timestamp).format('MMM D, YYYY') : '';
  };

  const parseAmount = (amount?: string, coin?: string) => {
    return amount && coin ? amount + ' ' + coin : '';
  };

  const getIcon = (coinbaseTx: CoinbaseTransactionProps) => {
    return CoinbaseIcon(coinbaseTx);
  };

  const [currencyAbbreviation, setCurrencyAbbreviation] = useState('');
  const [chain, setChain] = useState('');
  const [protocolName, setProtocolName] = useState('');

  const onPressTransaction = useMemo(
    () => (transaction: any) => {
      navigation.navigate('Coinbase', {
        screen: 'CoinbaseTransaction',
        params: {tx: transaction},
      });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({item}) => (
      <TransactionRow
        icon={getIcon(item)}
        description={item.details.title}
        details={item.details.subtitle}
        time={parseTime(item.created_at)}
        value={parseAmount(item.amount.amount, item.amount.currency)}
        onPressTransaction={() => onPressTransaction(item)}
      />
    ),
    [onPressTransaction],
  );

  const listFooterComponent = () => {
    return (
      <>
        {!groupedTransactions?.length ? null : (
          <View style={{marginBottom: 20}}>
            <BorderBottom />
          </View>
        )}
        {isLoading || initialLoad ? (
          <SkeletonContainer>
            <WalletTransactionSkeletonRow />
          </SkeletonContainer>
        ) : null}
      </>
    );
  };

  const listEmptyComponent = () => {
    return (
      <>
        {!initialLoad && !groupedTransactions.length && (
          <EmptyListContainer>
            <H5>
              {!errorLoadingTxs
                ? t("It's a ghost town in here")
                : t('Could not update transaction history')}
            </H5>
            <GhostSvg style={{marginTop: 20}} />
          </EmptyListContainer>
        )}
      </>
    );
  };

  const getLogoUri = (coin: string, _chain: string) => {
    if (
      SupportedCurrencyOptions.find(
        ({currencyAbbreviation, chain}) =>
          currencyAbbreviation === coin.toLowerCase() &&
          (!chain || chain === _chain),
      )
    ) {
      return SupportedCurrencyOptions.find(
        ({currencyAbbreviation, chain}) =>
          currencyAbbreviation === coin.toLowerCase() &&
          (!chain || chain === _chain),
      )!.img;
    } else if (tokenData[getCurrencyAbbreviation(coin, _chain)]?.logoURI) {
      return tokenData[getCurrencyAbbreviation(coin, _chain)]?.logoURI;
    } else {
      return undefined;
    }
  };

  const loadTransactions = async (refresh?: boolean) => {
    if (!nextStartingAfter && !refresh) {
      return;
    }
    try {
      setIsLoading(!refresh);
      setErrorLoadingTxs(false);

      await dispatch(
        coinbaseGetTransactionsByAccount(accountId, refresh, nextStartingAfter),
      );

      setIsLoading(false);
    } catch (e) {
      setNextStartingAfter('');
      setIsLoading(false);
      setErrorLoadingTxs(true);
    }
  };

  useEffect(() => {
    // all wallets
    let availableWallets = Object.values(keys)
      .filter(key => key.backupComplete)
      .flatMap(key => key.wallets);

    if (account && account.balance) {
      const _currencyAbbreviation = account.balance.currency;
      const _chain =
        BitpaySupportedUtxoCoins[_currencyAbbreviation.toLowerCase()] ||
        OtherBitpaySupportedCoins[_currencyAbbreviation.toLowerCase()]
          ? _currencyAbbreviation.toLowerCase()
          : 'eth';

      availableWallets = availableWallets.filter(
        wallet =>
          !wallet.hideWallet &&
          wallet.network === 'livenet' &&
          wallet.credentials.coin === _currencyAbbreviation.toLowerCase() &&
          wallet.credentials.chain === _chain &&
          wallet.isComplete(),
      );

      if (availableWallets.length) {
        // Withdrawals to BitPay Wallet
        if (account.allow_withdrawals && Number(account.balance.amount) > 0) {
          setAvailableWalletToWithdraw(true);
        }
        // Deposit into Coinbase Account
        if (
          account.allow_deposits &&
          availableWallets.filter(wallet => wallet.balance.sat > 0).length
        ) {
          setAvailableWalletToDeposit(true);
        }
      }

      setCurrencyAbbreviation(_currencyAbbreviation);
      setChain(_chain);
      setProtocolName(getProtocolName(_chain, 'livenet') || '');

      const _currency: ToWalletSelectorCustomCurrency = {
        currencyAbbreviation: _currencyAbbreviation,
        symbol: getCurrencyAbbreviation(account.currency.code, chain),
        chain: _chain,
        name: account.currency.name,
        logoUri: getLogoUri(account.currency.code, chain),
      };

      setCustomSupportedCurrencies([_currency]);

      if (Number(account.balance.amount)) {
        const fa = coinbaseGetFiatAmount(
          account.balance.amount,
          account.balance.currency,
          exchangeRates,
        );
        setFiatAmount(fa);
        setCryptoAmount(account.balance.amount.toString());
      } else {
        setFiatAmount(0);
        setCryptoAmount('0');
      }
    }

    if (transactions && transactions[accountId]) {
      const _transactions = transactions[accountId].data;
      const _nextStartingAfter =
        transactions[accountId].pagination.next_starting_after;
      const _groupedTxs = GroupCoinbaseTransactions(_transactions);
      setGroupedTransactions(_groupedTxs);
      setNextStartingAfter(_nextStartingAfter);
    }

    if (txsLoading) {
      setIsLoading(true);
    } else {
      setInitialLoad(false);
      setIsLoading(false);
    }

    if (txsStatus && txsStatus === 'failed') {
      setErrorLoadingTxs(true);
    }
  }, [
    account,
    transactions,
    txsLoading,
    txsStatus,
    accountId,
    exchangeRates,
    keys,
    currencyAbbreviation,
    chain,
    protocolName,
  ]);

  const deposit = async () => {
    // Deposit:
    //   Transfer from BitPay wallet to Coinbase Account
    if (!account) {
      return;
    }
    dispatch(startOnGoingProcessModal('FETCHING_COINBASE_DATA'));
    dispatch(
      Analytics.track('Clicked Receive', {
        context: 'CoinbaseAccount',
      }),
    );
    dispatch(coinbaseCreateAddress(accountId))
      .then(async newAddress => {
        dispatch(dismissOnGoingProcessModal());
        if (!newAddress) {
          return;
        }
        if (
          account?.balance.currency === 'BCH' &&
          !IsValidBitcoinCashAddress(newAddress)
        ) {
          // Convert old format bch address to bch cash address
          newAddress = TranslateToBchCashAddress(newAddress);
          newAddress = ToCashAddress(newAddress, false);
        }
        await sleep(400);
        navigation.navigate('Wallet', {
          screen: 'GlobalSelect',
          params: {
            context: 'coinbase',
            recipient: {
              name: account.name || 'Coinbase',
              currency: currencyAbbreviation.toLowerCase(),
              chain: chain,
              address: newAddress,
              network: 'livenet',
            },
          },
        });
      })
      .catch(error => {
        showError(error);
      });
  };

  const onSelectedWallet = async (newWallet?: Wallet) => {
    setWalletModalVisible(false);
    dispatch(
      Analytics.track('Clicked Send', {
        context: 'CoinbaseAccount',
      }),
    );
    if (newWallet) {
      if (newWallet.credentials) {
        if (newWallet.isComplete()) {
          if (allKeys[newWallet.keyId].backupComplete) {
            setSelectedWallet(newWallet);
            await sleep(500);
            setAmountModalVisible(true);
          } else {
            dispatch(showWalletError('needsBackup'));
          }
        } else {
          dispatch(showWalletError('walletNotCompleted'));
        }
      } else {
        dispatch(showWalletError('walletNotSupported'));
      }
    }
  };

  const onEnteredAmount = (newAmount?: number) => {
    setAmountModalVisible(false);
    if (newAmount && selectedWallet) {
      navigation.navigate('Coinbase', {
        screen: 'CoinbaseWithdraw',
        params: {accountId, wallet: selectedWallet, amount: newAmount},
      });
    }
  };

  const showError = async (error: CoinbaseErrorsProps) => {
    const errMsg = coinbaseParseErrorToString(error);
    if (errMsg === 'Network Error') {
      return;
    }
    dispatch(
      showBottomNotificationModal({
        type: 'error',
        title: t('Coinbase error'),
        message: errMsg,
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('OK'),
            action: () => {},
            primary: true,
          },
        ],
      }),
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await sleep(1000);

    try {
      await dispatch(coinbaseGetAccountsAndBalance());
      await dispatch(coinbaseGetTransactionsByAccount(accountId, true));
    } catch (err: CoinbaseErrorsProps | any) {
      setRefreshing(false);
      showError(err);
    }
    setRefreshing(false);
  };

  useMount(() => {
    if (refresh) {
      onRefresh();
    }
  });

  const keyExtractor = useCallback(item => item.id, []);

  return (
    <AccountContainer>
      <SectionList
        refreshControl={
          <RefreshControl
            tintColor={theme.dark ? White : SlateDark}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListHeaderComponent={() => {
          return (
            <>
              <BalanceContainer>
                <Row>
                  {cryptoAmount && (
                    <Balance scale={shouldScale(cryptoAmount)}>
                      {cryptoAmount} {currencyAbbreviation}
                    </Balance>
                  )}
                </Row>
                <Row>
                  <H5>
                    {fiatAmount
                      ? formatFiatAmount(fiatAmount, defaultAltCurrency.isoCode)
                      : '0'}
                  </H5>
                  {account?.primary ? <Type>Primary</Type> : null}
                  {protocolName ? (
                    <TypeContainer>
                      <IconContainer>
                        <Icons.Network />
                      </IconContainer>
                      <TypeText>{protocolName}</TypeText>
                    </TypeContainer>
                  ) : null}
                </Row>
                <LinkingButtons
                  receive={{
                    cta: deposit,
                    label: t('deposit'),
                    hide: !availableWalletToDeposit,
                  }}
                  send={{
                    cta: () => {
                      setWalletModalVisible(true);
                    },
                    label: t('withdraw'),
                    hide: !availableWalletToWithdraw,
                  }}
                  buy={{cta: () => null, hide: true}}
                  swap={{cta: () => null, hide: true}}
                />
              </BalanceContainer>
            </>
          );
        }}
        sections={groupedTransactions}
        stickyHeaderIndices={[groupedTransactions?.length]}
        stickySectionHeadersEnabled={true}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={({section: {title}}) => {
          return (
            <TouchableOpacity>
              <TransactionSectionHeaderContainer>
                <H5>{title}</H5>
              </TransactionSectionHeaderContainer>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <BorderBottom />}
        ListEmptyComponent={listEmptyComponent}
        ListFooterComponent={listFooterComponent}
        onEndReached={() => loadTransactions()}
      />

      <ToWalletSelectorModal
        isVisible={walletModalVisible}
        modalContext={'coinbase'}
        disabledChain={undefined}
        customSupportedCurrencies={customSupportedCurrencies}
        livenetOnly={true}
        modalTitle={t('Select Destination')}
        onDismiss={async (
          newWallet?: Wallet,
          createNewWalletData?: AddWalletData,
        ) => {
          setWalletModalVisible(false);
          if (newWallet?.currencyAbbreviation) {
            onSelectedWallet(newWallet);
          } else if (createNewWalletData) {
            try {
              if (createNewWalletData.key.isPrivKeyEncrypted) {
                logger.debug('Key is Encrypted. Trying to decrypt...');
                await sleep(500);
                const password = await dispatch(
                  getDecryptPassword(createNewWalletData.key),
                );
                createNewWalletData.options.password = password;
              }

              await sleep(500);
              await dispatch(startOnGoingProcessModal('ADDING_WALLET'));
              const createdToWallet = await dispatch(
                addWallet(createNewWalletData),
              );
              logger.debug(
                `Added ${createdToWallet?.currencyAbbreviation} wallet from Coinbase`,
              );
              dispatch(
                Analytics.track('Created Basic Wallet', {
                  coin: createNewWalletData.currency.currencyAbbreviation,
                  chain: createNewWalletData.currency.chain,
                  isErc20Token: createNewWalletData.currency.isToken,
                  context: 'coinbase',
                }),
              );
              onSelectedWallet(createdToWallet);
              await sleep(300);
              dispatch(dismissOnGoingProcessModal());
              await sleep(500);
            } catch (err: any) {
              dispatch(dismissOnGoingProcessModal());
              await sleep(500);
              if (err.message === 'invalid password') {
                dispatch(showBottomNotificationModal(WrongPasswordError()));
              } else {
                showError(err.message);
              }
            }
          }
        }}
      />

      <AmountModal
        isVisible={amountModalVisible}
        cryptoCurrencyAbbreviation={currencyAbbreviation}
        fiatCurrencyAbbreviation={defaultAltCurrency.isoCode}
        chain={chain}
        onClose={() => setAmountModalVisible(false)}
        onSubmit={amt => onEnteredAmount(amt)}
      />
    </AccountContainer>
  );
};

export default CoinbaseAccount;
