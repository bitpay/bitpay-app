import {useNavigation, useTheme} from '@react-navigation/native';
import {StackScreenProps} from '@react-navigation/stack';
import React, {
  ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import analytics from '@segment/analytics-react-native';
import {useTranslation} from 'react-i18next';
import {
  Linking,
  RefreshControl,
  SectionList,
  Share,
  Text,
  View,
} from 'react-native';
import {batch} from 'react-redux';
import styled from 'styled-components/native';
import Settings from '../../../components/settings/Settings';
import {
  Balance,
  BaseText,
  H2,
  H5,
  HeaderTitle,
  Paragraph,
  Small,
} from '../../../components/styled/Text';
import {Network} from '../../../constants';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {startUpdateWalletStatus} from '../../../store/wallet/effects/status/status';
import {findWalletById, isSegwit} from '../../../store/wallet/utils/wallet';
import {
  toggleHideBalance,
  updatePortfolioBalance,
} from '../../../store/wallet/wallet.actions';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import {
  Air,
  Black,
  LightBlack,
  LuckySevens,
  SlateDark,
  White,
} from '../../../styles/colors';
import {shouldScale, sleep} from '../../../utils/helper-methods';
import LinkingButtons from '../../tabs/home/components/LinkingButtons';
import {
  BalanceUpdateError,
  CustomErrorMessage,
  RbfTransaction,
  SpeedupEthTransaction,
  SpeedupInsufficientFunds,
  SpeedupInvalidTx,
  SpeedupTransaction,
  UnconfirmedInputs,
} from '../components/ErrorMessages';
import OptionsSheet, {Option} from '../components/OptionsSheet';
import ReceiveAddress from '../components/ReceiveAddress';
import BalanceDetailsModal from '../components/BalanceDetailsModal';
import Icons from '../components/WalletIcons';
import {WalletStackParamList} from '../WalletStack';
import {buildUIFormattedWallet} from './KeyOverview';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {getPriceHistory, startGetRates} from '../../../store/wallet/effects';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';
import {
  CanSpeedupTx,
  GetTransactionHistory,
  GroupTransactionHistory,
  IsMoved,
  IsReceived,
  IsShared,
  TX_HISTORY_LIMIT,
} from '../../../store/wallet/effects/transactions/transactions';
import {ScreenGutter} from '../../../components/styled/Containers';
import TransactionRow, {
  TRANSACTION_ROW_HEIGHT,
} from '../../../components/list/TransactionRow';
import TransactionProposalRow from '../../../components/list/TransactionProposalRow';
import GhostSvg from '../../../../assets/img/ghost-straight-face.svg';
import WalletTransactionSkeletonRow from '../../../components/list/WalletTransactionSkeletonRow';
import {IsERCToken} from '../../../store/wallet/utils/currency';
import {DeviceEventEmitter} from 'react-native';
import {DeviceEmitterEvents} from '../../../constants/device-emitter-events';
import {isCoinSupportedToBuy} from '../../services/buy-crypto/utils/buy-crypto-utils';
import {isCoinSupportedToSwap} from '../../services/swap-crypto/utils/changelly-utils';
import {FlatList} from 'react-native';
import {
  buildBtcSpeedupTx,
  buildEthERCTokenSpeedupTx,
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
} from '../../../store/wallet/effects/send/send';
import KeySvg from '../../../../assets/img/key.svg';
import TimerSvg from '../../../../assets/img/timer.svg';
import InfoSvg from '../../../../assets/img/info.svg';
import {Effect} from '../../../store';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {Currencies} from '../../../constants/currencies';

type WalletDetailsScreenProps = StackScreenProps<
  WalletStackParamList,
  'WalletDetails'
>;

const WalletDetailsContainer = styled.View`
  flex: 1;
  padding-top: 10px;
`;

const HeaderContainer = styled.View`
  margin: 32px 0 24px;
`;

const Row = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: flex-end;
`;

const TouchableRow = styled.TouchableOpacity`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
`;

const BalanceContainer = styled.View`
  padding: 0 15px 40px;
  flex-direction: column;
`;

const TransactionSectionHeader = styled(H5)`
  padding: ${ScreenGutter};
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : '#F5F6F7')};
  height: 55px;
  width: 100%;
  display: flex;
  justify-content: space-between;
`;

const BorderBottom = styled.View`
  border-bottom-width: 1px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : Air)};
`;

const SkeletonContainer = styled.View`
  margin-bottom: 20px;
`;

const EmptyListContainer = styled.View`
  justify-content: space-between;
  align-items: center;
  margin-top: 50px;
`;

const LockedBalanceContainer = styled.TouchableOpacity`
  flex-direction: row;
  padding: ${ScreenGutter};
  justify-content: center;
  align-items: center;
  height: 75px;
`;

const Description = styled(BaseText)`
  overflow: hidden;
  margin-right: 175px;
  font-size: 16px;
`;

const TailContainer = styled.View`
  margin-left: auto;
`;

const HeadContainer = styled.View``;

const Value = styled(BaseText)`
  text-align: right;
  font-weight: 700;
  font-size: 16px;
`;

const Fiat = styled(BaseText)`
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  text-align: right;
`;

const HeaderKeyName = styled(BaseText)`
  text-align: center;
  margin-left: 5px;
  color: ${({theme: {dark}}) => (dark ? LuckySevens : SlateDark)};
  font-size: 12px;
  line-height: 20px;
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
  margin: 10px 4px 0;
`;

const IconContainer = styled.View`
  margin-right: 5px;
`;

const TypeText = styled(BaseText)`
  font-size: 12px;
  color: ${({theme: {dark}}) => (dark ? LuckySevens : SlateDark)};
`;

const getWalletType = (
  key: Key,
  wallet: Wallet,
): undefined | {title: string; icon?: ReactElement} => {
  const {
    credentials: {token, walletId, addressType, keyId},
  } = wallet;
  if (!keyId) {
    return {title: 'Read Only'};
  }
  if (token) {
    const linkedWallet = key.wallets.find(({tokens}) =>
      tokens?.includes(walletId),
    );
    const walletName =
      linkedWallet?.walletName || linkedWallet?.credentials.walletName;
    return {title: `${walletName}`, icon: <Icons.Wallet />};
  }

  if (isSegwit(addressType)) {
    return {title: 'Segwit'};
  }
  return;
};

const getChain =
  (currencyAbbreviation: string, network: string): Effect<string | undefined> =>
  dispatch => {
    if (
      currencyAbbreviation === 'eth' ||
      dispatch(IsERCToken(currencyAbbreviation))
    ) {
      return network === 'testnet' ? 'Kovan' : 'Ethereum Mainnet';
    }

    return network === 'testnet' ? 'Testnet' : undefined;
  };

const WalletDetails: React.FC<WalletDetailsScreenProps> = ({route}) => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const {t} = useTranslation();
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const {walletId, skipInitializeHistory} = route.params;
  const keys = useAppSelector(({WALLET}) => WALLET.keys);

  const wallets = Object.values(keys).flatMap(k => k.wallets);

  const contactList = useAppSelector(({CONTACT}) => CONTACT.list);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const fullWalletObj = findWalletById(wallets, walletId) as Wallet;
  const key = keys[fullWalletObj.keyId];
  const uiFormattedWallet = buildUIFormattedWallet(
    fullWalletObj,
    defaultAltCurrency.isoCode,
    'symbol',
  );
  const [showReceiveAddressBottomModal, setShowReceiveAddressBottomModal] =
    useState(false);
  const [showBalanceDetailsModal, setShowBalanceDetailsModal] = useState(false);
  const walletType = getWalletType(key, fullWalletObj);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <>
          <HeaderSubTitleContainer>
            <KeySvg width={10} height={10} />
            <HeaderKeyName>{key.keyName}</HeaderKeyName>
          </HeaderSubTitleContainer>
          <HeaderTitle style={{textAlign: 'center'}}>
            {uiFormattedWallet.walletName}
          </HeaderTitle>
        </>
      ),
      headerRight: () => (
        <Settings
          onPress={() => {
            setShowWalletOptions(true);
          }}
        />
      ),
    });
  }, [navigation, uiFormattedWallet.walletName, key.keyName]);

  useEffect(() => {
    setRefreshing(!!fullWalletObj.isRefreshing);
  }, [fullWalletObj.isRefreshing]);

  const ShareAddress = async () => {
    try {
      await sleep(1000);
      const address = (await dispatch<any>(
        createWalletAddress({wallet: fullWalletObj, newAddress: false}),
      )) as string;

      await Share.share({
        message: address,
      });
    } catch (e) {}
  };

  const assetOptions: Array<Option> = [
    {
      img: <Icons.RequestAmount />,
      title: t('Request a specific amount'),
      description: t(
        'This will generate an invoice, which the person you send it to can pay using any wallet.',
      ),
      onPress: () => {
        navigation.navigate('Wallet', {
          screen: 'Amount',
          params: {
            currencyAbbreviationRouteParam:
              fullWalletObj.currencyAbbreviation.toUpperCase(),
            onAmountSelected: async (amount, setButtonState) => {
              setButtonState('success');
              await sleep(500);
              navigation.navigate('Wallet', {
                screen: 'RequestSpecificAmountQR',
                params: {wallet: fullWalletObj, requestAmount: Number(amount)},
              });
            },
            opts: {
              hideSendMax: true,
            },
          },
        });
      },
    },
    {
      img: <Icons.ShareAddress />,
      title: t('Share Address'),
      description: t(
        'Share your wallet address to someone in your contacts so they can send you funds.',
      ),
      onPress: ShareAddress,
    },
    {
      img: <Icons.Settings />,
      title: t('Wallet Settings'),
      description: t('View all the ways to manage and configure your wallet.'),
      onPress: () =>
        navigation.navigate('Wallet', {
          screen: 'WalletSettings',
          params: {
            key,
            walletId,
          },
        }),
    },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    await sleep(1000);

    try {
      dispatch(getPriceHistory(defaultAltCurrency.isoCode));
      await dispatch(startGetRates({force: true}));
      await Promise.all([
        await dispatch(startUpdateWalletStatus({key, wallet: fullWalletObj})),
        await loadHistory(true),
        sleep(1000),
      ]);
      dispatch(updatePortfolioBalance());
    } catch (err) {
      dispatch(showBottomNotificationModal(BalanceUpdateError));
    }
    setRefreshing(false);
  };

  const {
    cryptoBalance,
    cryptoLockedBalance,
    cryptoSpendableBalance,
    fiatBalance,
    fiatLockedBalance,
    fiatSpendableBalance,
    currencyAbbreviation,
    network,
    hideBalance,
    pendingTxps,
  } = uiFormattedWallet;

  const showFiatBalance =
    // @ts-ignore
    Number(cryptoBalance.replaceAll(',', '')) > 0 &&
    network !== Network.testnet;

  const [history, setHistory] = useState<any[]>([]);
  const [groupedHistory, setGroupedHistory] = useState<
    {title: string; data: any[]}[]
  >([]);
  const [loadMore, setLoadMore] = useState(true);
  const [isLoading, setIsLoading] = useState<boolean>();
  const [errorLoadingTxs, setErrorLoadingTxs] = useState<boolean>();
  // const [needActionPendingTxps, setNeedActionPendingTxps] = useState<any[]>([]);  TODO

  const loadHistory = async (refresh?: boolean) => {
    if (!loadMore && !refresh) {
      return;
    }
    try {
      batch(() => {
        setIsLoading(!refresh);
        setErrorLoadingTxs(false);
      });

      const [transactionHistory] = await Promise.all([
        dispatch(
          GetTransactionHistory({
            wallet: fullWalletObj,
            transactionsHistory: history,
            limit: TX_HISTORY_LIMIT,
            contactList,
            refresh,
          }),
        ),
      ]);

      batch(() => {
        if (transactionHistory) {
          let {transactions: _history, loadMore: _loadMore} =
            transactionHistory;

          if (_history?.length) {
            setHistory(_history);
            const grouped = GroupTransactionHistory(_history);
            setGroupedHistory(grouped);
          }

          setLoadMore(_loadMore);
        }

        setIsLoading(false);
      });
    } catch (e) {
      setLoadMore(false);
      setIsLoading(false);
      setErrorLoadingTxs(true);

      console.log('Transaction Update: ', e);
    }
  };
  const loadHistoryRef = useRef(loadHistory);
  loadHistoryRef.current = loadHistory;

  useEffect(() => {
    dispatch(startUpdateWalletStatus({key, wallet: fullWalletObj}));
    const subscription = DeviceEventEmitter.addListener(
      DeviceEmitterEvents.WALLET_LOAD_HISTORY,
      () => {
        loadHistoryRef.current(true);
      },
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!skipInitializeHistory) {
      loadHistoryRef.current();
    }
  }, [skipInitializeHistory]);

  const listFooterComponent = () => {
    return (
      <>
        {!groupedHistory?.length ? null : (
          <View style={{marginBottom: 20}}>
            <BorderBottom />
          </View>
        )}
        {isLoading ? (
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
        {!isLoading && !errorLoadingTxs && (
          <EmptyListContainer>
            <H5>{t("It's a ghost town in here")}</H5>
            <GhostSvg style={{marginTop: 20}} />
          </EmptyListContainer>
        )}

        {!isLoading && errorLoadingTxs && (
          <EmptyListContainer>
            <H5>{t('Could not update transaction history')}</H5>
            <GhostSvg style={{marginTop: 20}} />
          </EmptyListContainer>
        )}
      </>
    );
  };

  const goToTransactionDetails = (transaction: any) => {
    navigation.navigate('Wallet', {
      screen: 'TransactionDetails',
      params: {wallet: fullWalletObj, transaction},
    });
  };

  const speedupTransaction = async (transaction: any) => {
    try {
      let tx: any;
      if (
        currencyAbbreviation.toLowerCase() === 'eth' ||
        dispatch(IsERCToken(currencyAbbreviation))
      ) {
        tx = await dispatch(
          buildEthERCTokenSpeedupTx(fullWalletObj, transaction),
        );
        goToConfirm(tx);
      }

      if (currencyAbbreviation.toLowerCase() === 'btc') {
        const address = await dispatch<Promise<string>>(
          createWalletAddress({wallet: fullWalletObj, newAddress: false}),
        );

        tx = await buildBtcSpeedupTx(fullWalletObj, transaction, address);

        dispatch(
          showBottomNotificationModal({
            type: 'warning',
            title: t('Miner fee notice'),
            message: t(
              'Because you are speeding up this transaction, the Bitcoin miner fee () will be deducted from the total.',
              {speedupFee: tx.speedupFee, currencyAbbreviation},
            ),
            enableBackdropDismiss: true,
            actions: [
              {
                text: t('Got It'),
                action: () => {
                  goToConfirm(tx);
                },
                primary: true,
              },
            ],
          }),
        );
      }
    } catch (e) {
      switch (e) {
        case 'InsufficientFunds':
          dispatch(showBottomNotificationModal(SpeedupInsufficientFunds()));
          break;
        case 'NoInput':
          dispatch(showBottomNotificationModal(SpeedupInvalidTx()));
          break;
        default:
          dispatch(
            showBottomNotificationModal(
              CustomErrorMessage({
                errMsg: t(
                  'Error getting "Speed Up" information. Please try again later.',
                ),
              }),
            ),
          );
      }
    }
  };

  const goToConfirm = async (tx: any) => {
    try {
      const {recipient, amount} = tx;
      const {txDetails, txp: newTxp} = await dispatch(
        createProposalAndBuildTxDetails(tx),
      );

      navigation.navigate('Wallet', {
        screen: 'Confirm',
        params: {
          wallet: fullWalletObj,
          recipient,
          txp: newTxp,
          txDetails,
          amount,
          speedup: true,
        },
      });
    } catch (err: any) {
      const [errorMessageConfig] = await Promise.all([
        dispatch(handleCreateTxProposalError(err)),
        sleep(400),
      ]);
      dispatch(
        showBottomNotificationModal({
          ...errorMessageConfig,
          enableBackdropDismiss: false,
          actions: [
            {
              text: t('OK'),
              action: () => {},
            },
          ],
        }),
      );
    }
  };

  const showBalanceDetailsButton = (): boolean => {
    if (!fullWalletObj) {
      return false;
    }
    return fullWalletObj.balance?.sat != fullWalletObj.balance?.satSpendable;
  };

  const viewOnBlockchain = async () => {
    const coin = fullWalletObj.currencyAbbreviation.toLowerCase();
    if (['eth', 'xrp'].includes(coin) || dispatch(IsERCToken(coin))) {
      let address;
      try {
        address = (await dispatch<any>(
          createWalletAddress({wallet: fullWalletObj, newAddress: false}),
        )) as string;
      } catch {
        return;
      }

      let url: string | undefined;
      if (coin === 'xrp') {
        url =
          fullWalletObj.network === 'livenet'
            ? `https://${Currencies.xrp.paymentInfo.blockExplorerUrls}account/${address}`
            : `https://${Currencies.xrp.paymentInfo.blockExplorerUrlsTestnet}account/${address}`;
      }
      if (coin === 'eth') {
        url =
          fullWalletObj.network === 'livenet'
            ? `https://${Currencies.eth.paymentInfo.blockExplorerUrls}address/${address}`
            : `https://${Currencies.eth.paymentInfo.blockExplorerUrlsTestnet}address/${address}`;
      }
      if (dispatch(IsERCToken(coin))) {
        url =
          fullWalletObj.network === 'livenet'
            ? `https://${Currencies.eth?.paymentInfo.blockExplorerUrls}address/${address}#tokentxns`
            : `https://${Currencies.eth?.paymentInfo.blockExplorerUrlsTestnet}address/${address}#tokentxns`;
      }

      if (url) {
        openPopUpConfirmation(coin, url);
      }
    }
  };

  const openPopUpConfirmation = (coin: string, url: string): void => {
    dispatch(
      showBottomNotificationModal({
        type: 'question',
        title: 'View on blockchain',
        message: `Continue to view ${coin.toUpperCase()} transaction history`,
        enableBackdropDismiss: true,
        actions: [
          {
            text: 'CONTINUE',
            action: () => {
              Linking.openURL(url);
            },
            primary: true,
          },
          {
            text: 'GO BACK',
            action: () => {},
          },
        ],
      }),
    );
  };

  const onPressTransaction = useMemo(
    () => (transaction: any) => {
      const {hasUnconfirmedInputs, action, isRBF} = transaction;
      const isReceived = IsReceived(action);
      const isMoved = IsMoved(action);
      const currency = currencyAbbreviation.toLowerCase();

      if (
        hasUnconfirmedInputs &&
        (isReceived || isMoved) &&
        currency === 'btc'
      ) {
        dispatch(
          showBottomNotificationModal(
            UnconfirmedInputs(() => goToTransactionDetails(transaction)),
          ),
        );
      } else if (isRBF && isReceived && currency === 'btc') {
        dispatch(
          showBottomNotificationModal(
            RbfTransaction(
              () => speedupTransaction(transaction),
              () => goToTransactionDetails(transaction),
            ),
          ),
        );
      } else if (dispatch(CanSpeedupTx(transaction, currency))) {
        if (currency === 'eth' || dispatch(IsERCToken(currency))) {
          dispatch(
            showBottomNotificationModal(
              SpeedupEthTransaction(
                () => speedupTransaction(transaction),
                () => goToTransactionDetails(transaction),
              ),
            ),
          );
        } else {
          dispatch(
            showBottomNotificationModal(
              SpeedupTransaction(
                () => speedupTransaction(transaction),
                () => goToTransactionDetails(transaction),
              ),
            ),
          );
        }
      } else {
        goToTransactionDetails(transaction);
      }
    },
    [],
  );

  const onPressTxp = useMemo(
    () => (transaction: any) => {
      navigation.navigate('Wallet', {
        screen: 'TransactionProposalDetails',
        params: {wallet: fullWalletObj, transaction, key},
      });
    },
    [],
  );

  const renderTransaction = useCallback(({item}) => {
    return (
      <TransactionRow
        icon={item.uiIcon}
        iconURI={item.uiIconURI}
        description={item.uiDescription}
        time={item.uiTime}
        value={item.uiValue}
        onPressTransaction={() => onPressTransaction(item)}
      />
    );
  }, []);

  const renderTxp = useCallback(({item}) => {
    return (
      <TransactionProposalRow
        icon={item.uiIcon}
        creator={item.uiCreator}
        time={item.uiTime}
        value={item.uiValue}
        onPressTransaction={() => onPressTxp(item)}
      />
    );
  }, []);

  const keyExtractor = useCallback(item => item.txid, []);

  const getItemLayout = useCallback(
    (data, index) => ({
      length: TRANSACTION_ROW_HEIGHT,
      offset: TRANSACTION_ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  const chain = dispatch(getChain(currencyAbbreviation.toLowerCase(), network));

  return (
    <WalletDetailsContainer>
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
              <HeaderContainer>
                <BalanceContainer>
                  <TouchableOpacity
                    onLongPress={() => {
                      dispatch(toggleHideBalance({wallet: fullWalletObj}));
                    }}>
                    <Row>
                      {!hideBalance ? (
                        <Balance scale={shouldScale(cryptoBalance)}>
                          {cryptoBalance} {currencyAbbreviation}
                        </Balance>
                      ) : (
                        <H2>****</H2>
                      )}
                    </Row>
                    <Row>
                      {showFiatBalance && !hideBalance && (
                        <Paragraph>{fiatBalance}</Paragraph>
                      )}
                    </Row>
                  </TouchableOpacity>
                  {!hideBalance && showBalanceDetailsButton() && (
                    <TouchableRow
                      onPress={() => setShowBalanceDetailsModal(true)}>
                      <TimerSvg
                        width={28}
                        height={15}
                        fill={theme.dark ? White : Black}
                      />
                      <Small>
                        <Text style={{fontWeight: 'bold'}}>
                          {cryptoSpendableBalance} {currencyAbbreviation}
                        </Text>
                        {showFiatBalance && (
                          <Text> ({fiatSpendableBalance})</Text>
                        )}
                      </Small>
                    </TouchableRow>
                  )}
                  <Row>
                    {walletType && (
                      <TypeContainer>
                        {walletType.icon ? (
                          <IconContainer>{walletType.icon}</IconContainer>
                        ) : null}
                        <TypeText>{walletType.title}</TypeText>
                      </TypeContainer>
                    )}
                    {chain ? (
                      <TypeContainer>
                        <IconContainer>
                          <Icons.Network />
                        </IconContainer>
                        <TypeText>{chain}</TypeText>
                      </TypeContainer>
                    ) : null}
                    {IsShared(fullWalletObj) ? (
                      <TypeContainer>
                        <TypeText>
                          Multisig {fullWalletObj.credentials.m}/
                          {fullWalletObj.credentials.n}
                        </TypeText>
                      </TypeContainer>
                    ) : null}
                    {['xrp'].includes(fullWalletObj?.currencyAbbreviation) ? (
                      <TouchableOpacity
                        onPress={() => setShowBalanceDetailsModal(true)}>
                        <InfoSvg />
                      </TouchableOpacity>
                    ) : null}
                    {['xrp'].includes(fullWalletObj?.currencyAbbreviation) &&
                    Number(fullWalletObj?.balance?.cryptoConfirmedLocked) >=
                      20 ? (
                      <TypeContainer>
                        <TypeText>{t('Activated')}</TypeText>
                      </TypeContainer>
                    ) : null}
                  </Row>
                </BalanceContainer>

                {fullWalletObj ? (
                  <LinkingButtons
                    buy={{
                      hide: !isCoinSupportedToBuy(
                        fullWalletObj.currencyAbbreviation,
                      ),
                      cta: () => {
                        analytics.track('BitPay App - Clicked Buy Crypto', {
                          from: 'walletDetails',
                          coin: fullWalletObj.currencyAbbreviation,
                          appUser: user?.eid || '',
                        });
                        navigation.navigate('Wallet', {
                          screen: 'Amount',
                          params: {
                            onAmountSelected: async (amount: string) => {
                              navigation.navigate('BuyCrypto', {
                                screen: 'BuyCryptoRoot',
                                params: {
                                  amount: Number(amount),
                                  fromWallet: fullWalletObj,
                                },
                              });
                            },
                            opts: {
                              hideSendMax: true,
                            },
                          },
                        });
                      },
                    }}
                    swap={{
                      hide:
                        fullWalletObj.credentials?.network === 'testnet' ||
                        !isCoinSupportedToSwap(
                          fullWalletObj.currencyAbbreviation,
                        ),
                      cta: () => {
                        analytics.track('BitPay App - Clicked Swap Crypto', {
                          from: 'walletDetails',
                          coin: fullWalletObj.currencyAbbreviation,
                          appUser: user?.eid || '',
                        });
                        navigation.navigate('SwapCrypto', {
                          screen: 'Root',
                          params: {
                            selectedWallet: fullWalletObj,
                          },
                        });
                      },
                    }}
                    receive={{
                      cta: () => setShowReceiveAddressBottomModal(true),
                    }}
                    send={{
                      hide: !fullWalletObj.balance.sat,
                      cta: () =>
                        navigation.navigate('Wallet', {
                          screen: 'SendTo',
                          params: {wallet: fullWalletObj},
                        }),
                    }}
                  />
                ) : null}
              </HeaderContainer>
              {pendingTxps && pendingTxps[0] ? (
                <TransactionSectionHeader>
                  {fullWalletObj.credentials.m > 1
                    ? t('Pending Proposals')
                    : t('Unsent Transactions')}
                </TransactionSectionHeader>
              ) : null}
              <FlatList
                contentContainerStyle={{paddingTop: 20, paddingBottom: 20}}
                data={pendingTxps} // TODO use needActionPendingTxps
                keyExtractor={keyExtractor}
                renderItem={renderTxp}
              />

              {Number(cryptoLockedBalance) > 0 ? (
                <LockedBalanceContainer>
                  <HeadContainer>
                    <Description numberOfLines={1} ellipsizeMode={'tail'}>
                      {t('Total Locked Balance')}
                    </Description>
                  </HeadContainer>

                  <TailContainer>
                    <Value>
                      {cryptoLockedBalance} {currencyAbbreviation}
                    </Value>
                    <Fiat>
                      {network === 'testnet'
                        ? 'Test Only - No Value'
                        : fiatLockedBalance}
                    </Fiat>
                  </TailContainer>
                </LockedBalanceContainer>
              ) : null}
            </>
          );
        }}
        sections={groupedHistory}
        stickyHeaderIndices={[groupedHistory?.length]}
        stickySectionHeadersEnabled={true}
        keyExtractor={keyExtractor}
        renderItem={renderTransaction}
        renderSectionHeader={({section: {title}}) => {
          return (
            <TouchableOpacity onPress={() => viewOnBlockchain()}>
              <TransactionSectionHeader>{title}</TransactionSectionHeader>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <BorderBottom />}
        ListFooterComponent={listFooterComponent}
        onEndReached={() => loadHistory()}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={listEmptyComponent}
        maxToRenderPerBatch={15}
        getItemLayout={getItemLayout}
      />

      <OptionsSheet
        isVisible={showWalletOptions}
        closeModal={() => setShowWalletOptions(false)}
        title={t('WalletOptions')}
        options={assetOptions}
      />

      {fullWalletObj ? (
        <BalanceDetailsModal
          isVisible={showBalanceDetailsModal}
          closeModal={() => setShowBalanceDetailsModal(false)}
          wallet={uiFormattedWallet}
        />
      ) : null}

      {fullWalletObj ? (
        <ReceiveAddress
          isVisible={showReceiveAddressBottomModal}
          closeModal={() => setShowReceiveAddressBottomModal(false)}
          wallet={fullWalletObj}
        />
      ) : null}
    </WalletDetailsContainer>
  );
};

export default WalletDetails;
