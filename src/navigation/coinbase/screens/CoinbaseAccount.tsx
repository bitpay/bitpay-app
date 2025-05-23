import {useNavigation, useTheme} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {FlashList} from '@shopify/flash-list';
import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {useTranslation} from 'react-i18next';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
  useMount,
} from '../../../utils/hooks';
import styled from 'styled-components/native';
import {RefreshControl, View, Platform} from 'react-native';
import {find} from 'lodash';
import moment from 'moment';
import {
  getCurrencyAbbreviation,
  getProtocolName,
  sleep,
  getBadgeImg,
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
  Black,
} from '../../../styles/colors';
import GhostSvg from '../../../../assets/img/ghost-straight-face.svg';
import WalletTransactionSkeletonRow from '../../../components/list/WalletTransactionSkeletonRow';
import LinkingButtons from '../../tabs/home/components/LinkingButtons';
import TransactionRow, {
  TRANSACTION_ROW_HEIGHT,
} from '../../../components/list/TransactionRow';

import {CoinbaseGroupParamList} from '../CoinbaseGroup';
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
import {BitpaySupportedTokens} from '../../../constants/currencies';
import GlobalSelect, {
  ToWalletSelectorCustomCurrency,
} from '../../wallet/screens/GlobalSelect';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';

const AccountContainer = styled.SafeAreaView`
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

const GlobalSelectContainer = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

export type CoinbaseAccountScreenParamList = {
  accountId: string;
  refresh?: boolean;
};

const capitalize = (text: string) => {
  return text
    .replace(/_/g, ' ')
    .replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());
};

export const parseTransactionTitle = (
  data: CoinbaseTransactionProps,
): string => {
  if (data.type === 'send') {
    const num = parseFloat(data.amount.amount);
    if (!isNaN(num) && num < 0) {
      return 'Sent';
    } else {
      return 'Received';
    }
  } else {
    return capitalize(data.type);
  }
};

const CoinbaseAccount = ({
  route,
}: NativeStackScreenProps<CoinbaseGroupParamList, 'CoinbaseAccount'>) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {accountId, refresh} = route.params;
  const logger = useLogger();
  const tokenDataByAddress = useAppSelector(
    ({WALLET}: RootState) => WALLET.tokenDataByAddress,
  );
  const allKeys = useAppSelector(({WALLET}: RootState) => WALLET.keys);

  const [refreshing, setRefreshing] = useState(false);
  const [customSupportedCurrencies, setCustomSupportedCurrencies] = useState(
    [] as ToWalletSelectorCustomCurrency[],
  );
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [amountModalVisible, setAmountModalVisible] = useState(false);
  const [fiatAmount, setFiatAmount] = useState(0);
  const [cryptoAmount, setCryptoAmount] = useState('0');
  const [groupedTransactions, setGroupedTransactions] = useState<any[]>([]);

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
  useLayoutEffect(() => {
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
  const [tokenAddress, setTokenAddress] = useState(
    undefined as string | undefined,
  );
  const [protocolName, setProtocolName] = useState('');

  const onPressTransaction = useMemo(
    () => (transaction: any) => {
      navigation.navigate('CoinbaseTransaction', {tx: transaction});
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({item}) => (
      <TransactionRow
        icon={getIcon(item)}
        description={parseTransactionTitle(item)}
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
        {isLoading && initialLoad ? (
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

  const getLogoUri = (_currencyAbbreviation: string, _chain: string) => {
    const foundToken = Object.values(tokenDataByAddress).find(
      token =>
        token.coin === _currencyAbbreviation.toLowerCase() &&
        token.chain === _chain,
    );
    if (
      SupportedCurrencyOptions.find(
        ({currencyAbbreviation, chain}) =>
          currencyAbbreviation === _currencyAbbreviation.toLowerCase() &&
          (!chain || chain === _chain),
      )
    ) {
      return SupportedCurrencyOptions.find(
        ({currencyAbbreviation, chain}) =>
          currencyAbbreviation === _currencyAbbreviation.toLowerCase() &&
          (!chain || chain === _chain),
      )!.img;
    } else if (foundToken?.logoURI) {
      return foundToken?.logoURI;
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
          !wallet.hideWalletByAccount &&
          wallet.network === 'livenet' &&
          wallet.currencyAbbreviation === _currencyAbbreviation.toLowerCase() &&
          wallet.chain === _chain &&
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
      const foundToken = Object.values({
        ...BitpaySupportedTokens,
        ...tokenDataByAddress,
      }).find(
        token => token.coin === _currencyAbbreviation && token.chain === _chain,
      );

      setTokenAddress(foundToken?.address);
      setProtocolName(getProtocolName(_chain, 'livenet') || '');

      const _currency: ToWalletSelectorCustomCurrency = {
        currencyAbbreviation: _currencyAbbreviation,
        symbol: getCurrencyAbbreviation(account.currency.code, _chain),
        chain: _chain,
        name: account.currency.name,
        logoUri: getLogoUri(account.currency.code, _chain),
        badgeUri: getBadgeImg(account.currency.code, _chain),
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
      const flattenedGroups = _groupedTxs.reduce(
        (allTransactions, section) => [
          ...allTransactions,
          section.title,
          ...section.data,
        ],
        [] as any[],
      );
      setGroupedTransactions(flattenedGroups);
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
        navigation.navigate('GlobalSelect', {
          context: 'coinbaseDeposit',
          recipient: {
            name: account.name || 'Coinbase',
            currency: currencyAbbreviation.toLowerCase(),
            chain: chain,
            address: newAddress,
            network: 'livenet',
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

  const onEnteredAmount = async (newAmount?: number) => {
    setAmountModalVisible(false);
    await sleep(600);
    if (newAmount && selectedWallet) {
      navigation.navigate('CoinbaseWithdraw', {
        accountId,
        wallet: selectedWallet,
        amount: newAmount,
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

  const onDismiss = async (
    newWallet?: Wallet,
    createNewWalletData?: AddWalletData,
  ) => {
    setWalletModalVisible(false);
    if (newWallet?.currencyAbbreviation) {
      onSelectedWallet(newWallet);
    } else if (createNewWalletData) {
      try {
        if (
          createNewWalletData.key.isPrivKeyEncrypted &&
          !(
            createNewWalletData.currency?.isToken &&
            createNewWalletData.associatedWallet
          )
        ) {
          logger.debug('Key is Encrypted. Trying to decrypt...');
          await sleep(500);
          const password = await dispatch(
            getDecryptPassword(createNewWalletData.key),
          );
          createNewWalletData.options.password = password;
        } else {
          logger.debug(
            'Key is Encrypted, but not neccessary for tokens. Trying to create wallet...',
          );
        }

        await sleep(500);
        await dispatch(startOnGoingProcessModal('ADDING_WALLET'));
        const createdToWallet = await dispatch(addWallet(createNewWalletData));
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
  };

  const keyExtractor = useCallback((item, index) => index.toString(), []);

  return (
    <AccountContainer>
      <FlashList
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
                  sell={{cta: () => null, hide: true}}
                  swap={{cta: () => null, hide: true}}
                />
              </BalanceContainer>
            </>
          );
        }}
        data={groupedTransactions}
        estimatedItemSize={TRANSACTION_ROW_HEIGHT}
        stickyHeaderIndices={
          groupedTransactions
            .map((item, index) => {
              if (typeof item === 'string') {
                return index;
              } else {
                return null;
              }
            })
            .filter(item => item !== null) as number[]
        }
        keyExtractor={keyExtractor}
        renderItem={({item}) => {
          if (typeof item === 'string') {
            return (
              <TransactionSectionHeaderContainer>
                <H5>{item}</H5>
              </TransactionSectionHeaderContainer>
            );
          } else {
            return renderItem({item});
          }
        }}
        getItemType={item =>
          typeof item === 'string' ? 'sectionHeader' : 'row'
        }
        ItemSeparatorComponent={() => <BorderBottom />}
        ListEmptyComponent={listEmptyComponent}
        ListFooterComponent={listFooterComponent}
        onEndReached={() => loadTransactions()}
      />

      <SheetModal
        modalLibrary="bottom-sheet"
        isVisible={walletModalVisible}
        onBackdropPress={() => onDismiss()}
        fullscreen>
        <GlobalSelectContainer>
          <GlobalSelect
            route={route}
            navigation={navigation}
            modalContext={'coinbase'}
            customSupportedCurrencies={customSupportedCurrencies}
            livenetOnly={true}
            modalTitle={t('Select Destination')}
            useAsModal={true}
            globalSelectOnDismiss={onDismiss}
          />
        </GlobalSelectContainer>
      </SheetModal>

      <AmountModal
        isVisible={amountModalVisible}
        modalTitle={'Coinbase Withdraw'}
        context={'coinbase'}
        cryptoCurrencyAbbreviation={currencyAbbreviation}
        fiatCurrencyAbbreviation={defaultAltCurrency.isoCode}
        chain={chain}
        tokenAddress={tokenAddress}
        onClose={() => setAmountModalVisible(false)}
        onSubmit={amt => onEnteredAmount(amt)}
      />
    </AccountContainer>
  );
};

export default CoinbaseAccount;
