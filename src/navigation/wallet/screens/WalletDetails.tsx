import {useNavigation, useTheme} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {FlashList} from '@shopify/flash-list';
import i18next from 'i18next';
import _ from 'lodash';
import React, {
  ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {useTranslation} from 'react-i18next';
import {
  DeviceEventEmitter,
  Linking,
  RefreshControl,
  Share,
  Text,
  View,
} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import styled from 'styled-components/native';
import Settings from '../../../components/settings/Settings';
import {
  Balance,
  BaseText,
  H2,
  H5,
  HeaderTitle,
  Link,
  Paragraph,
  ProposalBadge,
  Small,
} from '../../../components/styled/Text';
import {Network} from '../../../constants';
import {
  showBottomNotificationModal,
  toggleHideAllBalances,
} from '../../../store/app/app.actions';
import {startUpdateWalletStatus} from '../../../store/wallet/effects/status/status';
import {
  buildUIFormattedWallet,
  findWalletById,
  isSegwit,
  isTaproot,
} from '../../../store/wallet/utils/wallet';
import {
  setWalletScanning,
  updatePortfolioBalance,
} from '../../../store/wallet/wallet.actions';
import {
  Key,
  TransactionProposal,
  Wallet,
} from '../../../store/wallet/wallet.models';
import {
  Air,
  Black,
  LightBlack,
  LuckySevens,
  SlateDark,
  White,
} from '../../../styles/colors';
import {
  formatCurrencyAbbreviation,
  getProtocolName,
  shouldScale,
  sleep,
} from '../../../utils/helper-methods';
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
import {WalletScreens, WalletGroupParamList} from '../WalletGroup';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {startGetRates} from '../../../store/wallet/effects';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';
import {
  BuildUiFriendlyList,
  CanSpeedupTx,
  GetTransactionHistory,
  GroupTransactionHistory,
  IsMoved,
  IsReceived,
  IsShared,
  TX_HISTORY_LIMIT,
} from '../../../store/wallet/effects/transactions/transactions';
import {
  ProposalBadgeContainer,
  ScreenGutter,
} from '../../../components/styled/Containers';
import TransactionRow, {
  TRANSACTION_ROW_HEIGHT,
} from '../../../components/list/TransactionRow';
import TransactionProposalRow from '../../../components/list/TransactionProposalRow';
import GhostSvg from '../../../../assets/img/ghost-straight-face.svg';
import WalletTransactionSkeletonRow from '../../../components/list/WalletTransactionSkeletonRow';
import {IsERCToken} from '../../../store/wallet/utils/currency';
import {DeviceEmitterEvents} from '../../../constants/device-emitter-events';
import {isCoinSupportedToBuy} from '../../services/buy-crypto/utils/buy-crypto-utils';
import {isCoinSupportedToSell} from '../../services/sell-crypto/utils/sell-crypto-utils';
import {isCoinSupportedToSwap} from '../../services/swap-crypto/utils/swap-crypto-utils';
import {
  buildBtcSpeedupTx,
  buildEthERCTokenSpeedupTx,
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
} from '../../../store/wallet/effects/send/send';
import KeySvg from '../../../../assets/img/key.svg';
import TimerSvg from '../../../../assets/img/timer.svg';
import InfoSvg from '../../../../assets/img/info.svg';
import {
  BitpaySupportedCoins,
  SUPPORTED_VM_TOKENS,
} from '../../../constants/currencies';
import ContactIcon from '../../tabs/contacts/components/ContactIcon';
import {
  TransactionIcons,
  TRANSACTION_ICON_SIZE,
} from '../../../constants/TransactionIcons';
import SentBadgeSvg from '../../../../assets/img/sent-badge.svg';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {getGiftCardIcons} from '../../../lib/gift-cards/gift-card';
import {BillPayAccount} from '../../../store/shop/shop.models';
import debounce from 'lodash.debounce';
import ArchaxFooter from '../../../components/archax/archax-footer';

export type WalletDetailsScreenParamList = {
  walletId: string;
  key?: Key;
  skipInitializeHistory?: boolean;
  copayerId?: string;
};

type WalletDetailsScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
  'WalletDetails'
>;

const WalletDetailsContainer = styled.SafeAreaView`
  flex: 1;
`;

const HeaderContainer = styled.View`
  margin: 32px 0 24px;
`;

const Row = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: flex-end;
`;

const TouchableRow = styled(TouchableOpacity)`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
`;

const BalanceContainer = styled.View`
  padding: 0 15px 40px;
  flex-direction: column;
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

const LockedBalanceContainer = styled(TouchableOpacity)`
  flex-direction: row;
  padding: ${ScreenGutter};
  justify-content: center;
  align-items: center;
  height: 75px;
`;

const Description = styled(BaseText)`
  overflow: hidden;
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

const LinkText = styled(Link)`
  font-weight: 500;
  font-size: 18px;
  text-align: center;
`;

const getWalletType = (
  key: Key,
  wallet: Wallet,
): undefined | {title: string; icon?: ReactElement} => {
  const {
    credentials: {token, walletId, addressType, keyId},
  } = wallet;
  if (!keyId) {
    return {title: i18next.t('Read Only')};
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

  if (isTaproot(addressType)) {
    return {title: 'Taproot'};
  }
  return;
};

const WalletDetails: React.FC<WalletDetailsScreenProps> = ({route}) => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const {t} = useTranslation();
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const {walletId, skipInitializeHistory, copayerId} = route.params;
  const {keys} = useAppSelector(({WALLET}) => WALLET);
  const {rates} = useAppSelector(({RATE}) => RATE);
  const supportedCardMap = useAppSelector(
    ({SHOP_CATALOG}) => SHOP_CATALOG.supportedCardMap,
  );

  const locationData = useAppSelector(({LOCATION}) => LOCATION.locationData);

  const wallets = Object.values(keys).flatMap(k => k.wallets);

  const contactList = useAppSelector(({CONTACT}) => CONTACT.list);
  const {defaultAltCurrency, hideAllBalances} = useAppSelector(({APP}) => APP);
  const fullWalletObj = findWalletById(wallets, walletId, copayerId) as Wallet;
  const key = keys[fullWalletObj.keyId];
  const uiFormattedWallet = buildUIFormattedWallet(
    fullWalletObj,
    defaultAltCurrency.isoCode,
    rates,
    dispatch,
    'symbol',
  );
  const accounts = useAppSelector(
    ({SHOP}) => SHOP.billPayAccounts[uiFormattedWallet.network],
  );
  const [showReceiveAddressBottomModal, setShowReceiveAddressBottomModal] =
    useState(false);
  const [showBalanceDetailsModal, setShowBalanceDetailsModal] = useState(false);
  const walletType = getWalletType(key, fullWalletObj);
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={{height: 'auto'}}>
          <HeaderSubTitleContainer>
            <KeySvg width={10} height={10} />
            <HeaderKeyName>{key.keyName}</HeaderKeyName>
          </HeaderSubTitleContainer>
          <HeaderTitle style={{textAlign: 'center'}}>
            {uiFormattedWallet.walletName}
          </HeaderTitle>
        </View>
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

      Share.share(
        {
          message: address,
          title: t('Share Address'),
        },
        {
          dialogTitle: t('Share Address'),
          subject: t('Share Address'),
          excludedActivityTypes: [
            'print',
            'addToReadingList',
            'markupAsPDF',
            'openInIbooks',
            'postToFacebook',
            'postToTwitter',
            'saveToCameraRoll',
            'sharePlay',
          ],
        },
      );
    } catch (e) {}
  };

  const onPressWithDelay = async (cb: () => void) => {
    await sleep(500);
    cb();
  };

  const createViewOnBlockchainOption = () => {
    if (
      ['eth', 'matic', 'xrp', 'arb', 'base', 'op', 'sol'].includes(
        fullWalletObj.chain.toLowerCase(),
      ) ||
      IsERCToken(
        fullWalletObj.currencyAbbreviation.toLowerCase(),
        fullWalletObj.chain.toLowerCase(),
      )
    ) {
      return {
        img: <Icons.Settings />,
        title: t('View Wallet in Explorer'),
        description: t(
          'View your wallet transactions and activities on the blockchain.',
        ),
        onPress: () => onPressWithDelay(viewOnBlockchain),
      };
    }
    return null;
  };

  const createRequestAmountOption = () => ({
    img: <Icons.RequestAmount />,
    title: t('Request a specific amount'),
    description: t(
      'This will generate an invoice, which the person you send it to can pay using any wallet.',
    ),
    onPress: () =>
      onPressWithDelay(() =>
        navigation.navigate(WalletScreens.AMOUNT, {
          cryptoCurrencyAbbreviation: fullWalletObj.currencyAbbreviation,
          chain: fullWalletObj.chain,
          tokenAddress: fullWalletObj.tokenAddress,
          onAmountSelected: async (amount, setButtonState) => {
            setButtonState('success');
            await sleep(500);
            navigation.navigate('RequestSpecificAmountQR', {
              wallet: fullWalletObj,
              requestAmount: Number(amount),
            });
            sleep(300).then(() => setButtonState(null));
          },
        }),
      ),
  });

  const createShareAddressOption = () => ({
    img: <Icons.ShareAddress />,
    title: t('Share Address'),
    description: t(
      'Share your wallet address to someone in your contacts so they can send you funds.',
    ),
    onPress: ShareAddress,
  });

  const createWalletSettingsOption = () => ({
    img: <Icons.Settings />,
    title: t('Wallet Settings'),
    description: t('View all the ways to manage and configure your wallet.'),
    onPress: () =>
      onPressWithDelay(() =>
        navigation.navigate('WalletSettings', {
          key,
          walletId,
        }),
      ),
  });

  const getAssetOptions = (): Option[] => {
    const options = [
      createViewOnBlockchainOption(),
      createRequestAmountOption(),
      createShareAddressOption(),
      createWalletSettingsOption(),
    ].filter(Boolean) as Option[];
    return options;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await sleep(1000);

    try {
      await dispatch(startGetRates({}));
      await Promise.all([
        await dispatch(
          startUpdateWalletStatus({key, wallet: fullWalletObj, force: true}),
        ),
        await debouncedLoadHistory(true),
        sleep(1000),
      ]);
      dispatch(updatePortfolioBalance());
      setNeedActionTxps(fullWalletObj.pendingTxps);
      if (fullWalletObj.isScanning) {
        // cancel scanning if user refreshes in case it's stuck
        dispatch(
          setWalletScanning({
            keyId: key.id,
            walletId: fullWalletObj.id,
            isScanning: false,
          }),
        );
      }
    } catch (err) {
      dispatch(showBottomNotificationModal(BalanceUpdateError()));
    }
    setRefreshing(false);
  };

  const {
    cryptoBalance,
    cryptoLockedBalance,
    cryptoSpendableBalance,
    fiatBalanceFormat,
    fiatLockedBalanceFormat,
    fiatSpendableBalanceFormat,
    currencyAbbreviation,
    chain,
    tokenAddress,
    network,
    pendingTxps,
  } = uiFormattedWallet;

  const showFiatBalance =
    // @ts-ignore
    Number(cryptoBalance.replaceAll(',', '')) > 0 &&
    network !== Network.testnet;

  const [history, setHistory] = useState<any[]>([]);
  const [groupedHistory, setGroupedHistory] = useState<any[]>([]);
  const [loadMore, setLoadMore] = useState(true);
  const [isLoading, setIsLoading] = useState<boolean>();
  const [errorLoadingTxs, setErrorLoadingTxs] = useState<boolean>();
  const [needActionPendingTxps, setNeedActionPendingTxps] = useState<any[]>([]);
  const [needActionUnsentTxps, setNeedActionUnsentTxps] = useState<any[]>([]);
  const [isScrolling, setIsScrolling] = useState<boolean>(false);

  const setNeedActionTxps = (pendingTxps: TransactionProposal[]) => {
    const txpsPending: TransactionProposal[] = [];
    const txpsUnsent: TransactionProposal[] = [];
    const formattedPendingTxps = BuildUiFriendlyList(
      pendingTxps,
      currencyAbbreviation,
      chain,
      [],
      tokenAddress,
      walletId,
    );
    formattedPendingTxps.forEach((txp: any) => {
      const action: any = _.find(txp.actions, {
        copayerId: fullWalletObj.credentials.copayerId,
      });

      const setPendingTx = (_txp: TransactionProposal) => {
        fullWalletObj.credentials.n > 1
          ? txpsPending.push(_txp)
          : txpsUnsent.push(_txp);
        setNeedActionPendingTxps(txpsPending);
        setNeedActionUnsentTxps(txpsUnsent);
      };
      if ((!action || action.type === 'failed') && txp.status === 'pending') {
        setPendingTx(txp);
      }
      // unsent transactions
      if (action && txp.status === 'accepted') {
        setPendingTx(txp);
      }
    });
  };

  const loadHistory = useCallback(
    async (refresh?: boolean) => {
      if ((!loadMore && !refresh) || fullWalletObj.isScanning) {
        return;
      }
      try {
        setIsLoading(!refresh);
        setErrorLoadingTxs(false);

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

        if (transactionHistory) {
          let {transactions: _history, loadMore: _loadMore} =
            transactionHistory;

          if (_history?.length) {
            setHistory(_history);
            const transactionGroups = GroupTransactionHistory(_history);
            const flattenedGroups = transactionGroups.reduce(
              (allTransactions, section) => [
                ...allTransactions,
                section.title,
                ...section.data,
              ],
              [] as any[],
            );
            setGroupedHistory(flattenedGroups);
          }

          setLoadMore(_loadMore);
        }

        setIsLoading(false);
      } catch (e) {
        setLoadMore(false);
        setIsLoading(false);
        setErrorLoadingTxs(true);

        console.log('Transaction Update: ', e);
      }
    },
    [history],
  );

  const debouncedLoadHistory = useMemo(
    () => debounce(loadHistory, 300, {leading: true}),
    [loadHistory],
  );

  const loadHistoryRef = useRef(debouncedLoadHistory);

  const updateWalletStatusAndProfileBalance = async () => {
    await dispatch(startUpdateWalletStatus({key, wallet: fullWalletObj}));
    dispatch(updatePortfolioBalance);
  };

  useEffect(() => {
    dispatch(
      Analytics.track('View Wallet', {
        coin: fullWalletObj?.currencyAbbreviation,
      }),
    );
    updateWalletStatusAndProfileBalance();
    if (!skipInitializeHistory) {
      debouncedLoadHistory();
    }
  }, []);

  useEffect(() => {
    setNeedActionTxps(fullWalletObj.pendingTxps);
    const subscription = DeviceEventEmitter.addListener(
      DeviceEmitterEvents.WALLET_LOAD_HISTORY,
      () => {
        loadHistoryRef.current(true);
        setNeedActionTxps(fullWalletObj.pendingTxps);
      },
    );
    return () => subscription.remove();
  }, [keys]);

  const itemSeparatorComponent = useCallback(() => <BorderBottom />, []);

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
    const onMemoChange = () => debouncedLoadHistory(true);
    navigation.navigate('TransactionDetails', {
      wallet: fullWalletObj,
      transaction,
      onMemoChange,
    });
  };

  const speedupTransaction = async (transaction: any) => {
    try {
      let tx: any;
      if (chain.toLowerCase() === 'eth') {
        tx = await dispatch(
          buildEthERCTokenSpeedupTx(fullWalletObj, transaction),
        );
        goToConfirm(tx);
      }

      if (currencyAbbreviation.toLowerCase() === 'btc') {
        const address = await dispatch<Promise<string>>(
          createWalletAddress({wallet: fullWalletObj, newAddress: false}),
        );

        tx = await dispatch(
          buildBtcSpeedupTx(fullWalletObj, transaction, address),
        );

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

      navigation.navigate('Confirm', {
        wallet: fullWalletObj,
        recipient,
        txp: newTxp,
        txDetails,
        amount,
        speedup: true,
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
        }),
      );
    }
  };

  const showBalanceDetailsButton = (): boolean => {
    if (!fullWalletObj) {
      return false;
    }
    return fullWalletObj.balance?.sat !== fullWalletObj.balance?.satSpendable;
  };

  const viewOnBlockchain = async (withConfirmation?: boolean) => {
    const coin = fullWalletObj.currencyAbbreviation.toLowerCase();
    const chain = fullWalletObj.chain.toLowerCase();

    if (
      ['eth', 'matic', 'xrp', 'arb', 'base', 'op', 'sol'].includes(chain) ||
      IsERCToken(coin, chain)
    ) {
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
            ? `https://${BitpaySupportedCoins.xrp.paymentInfo.blockExplorerUrls}account/${address}`
            : `https://${BitpaySupportedCoins.xrp.paymentInfo.blockExplorerUrlsTestnet}account/${address}`;
      }
      if (SUPPORTED_VM_TOKENS.includes(chain)) {
        url =
          fullWalletObj.network === 'livenet'
            ? `https://${BitpaySupportedCoins[chain].paymentInfo.blockExplorerUrls}address/${address}`
            : `https://${BitpaySupportedCoins[chain].paymentInfo.blockExplorerUrlsTestnet}address/${address}`;
      }
      if (IsERCToken(coin, chain)) {
        url =
          fullWalletObj.network === 'livenet'
            ? `https://${BitpaySupportedCoins[chain]?.paymentInfo.blockExplorerUrls}address/${address}#tokentxns`
            : `https://${BitpaySupportedCoins[chain]?.paymentInfo.blockExplorerUrlsTestnet}address/${address}#tokentxns`;
      }

      if (url) {
        withConfirmation
          ? openPopUpConfirmation(coin, url)
          : Linking.openURL(url);
      }
    }
  };

  const openPopUpConfirmation = (coin: string, url: string): void => {
    dispatch(
      showBottomNotificationModal({
        type: 'question',
        title: t('View on blockchain'),
        message: t('ViewTxHistory', {coin: coin.toUpperCase()}),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('CONTINUE'),
            action: () => {
              Linking.openURL(url);
            },
            primary: true,
          },
          {
            text: t('GO BACK'),
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
      } else if (CanSpeedupTx(transaction, currency, chain)) {
        if (chain === 'eth') {
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
      navigation.navigate('TransactionProposalDetails', {
        walletId: fullWalletObj.id,
        transactionId: transaction.id,
        keyId: key.id,
      });
    },
    [],
  );

  const onPressTxpBadge = useMemo(
    () => () => {
      navigation.navigate('TransactionProposalNotifications', {
        walletId: fullWalletObj.credentials.walletId,
      });
    },
    [],
  );

  const getBillPayIcon = (
    billPayAccounts: BillPayAccount[],
    merchantId: string,
  ): string => {
    const account = (billPayAccounts || []).find(
      acct => acct[acct.type].merchantId === merchantId,
    );
    return account ? account[account.type].merchantIcon : '';
  };

  const getTxDescriptionDetails = (key: string | undefined) => {
    if (!key) {
      return undefined;
    }
    switch (key) {
      case 'moonpay':
        return 'MoonPay';
      default:
        return undefined;
    }
  };

  const renderTransaction = useCallback(({item}) => {
    return (
      <TransactionRow
        icon={
          item.customData?.recipientEmail ? (
            <ContactIcon
              name={item.customData?.recipientEmail}
              size={TRANSACTION_ICON_SIZE}
              badge={<SentBadgeSvg />}
            />
          ) : (
            TransactionIcons[item.uiIcon]
          )
        }
        iconURI={
          getBillPayIcon(accounts, item.uiIconURI) ||
          getGiftCardIcons(supportedCardMap)[item.uiIconURI]
        }
        description={item.uiDescription}
        details={getTxDescriptionDetails(item.customData?.service)}
        time={item.uiTime}
        value={item.uiValue}
        onPressTransaction={() => onPressTransaction(item)}
      />
    );
  }, []);

  const renderTxp = useCallback(
    (items: any[]) => {
      return (
        <View style={{paddingTop: 20}}>
          {items.slice(0, 5).map((item, index) => (
            <TransactionProposalRow
              key={`${item.id}-${index}`}
              icon={TransactionIcons[item.uiIcon]}
              creator={item.uiCreator}
              time={item.uiTime}
              value={item.uiValue}
              message={item.message}
              onPressTransaction={() => onPressTxp(item)}
              recipientCount={item.recipientCount}
              toAddress={item.toAddress}
              tokenAddress={item.tokenAddress}
              chain={item.chain}
              contactList={contactList}
            />
          ))}
          {items.length > 5 && (
            <TouchableOpacity
              style={{paddingTop: 10}}
              onPress={onPressTxpBadge}>
              <LinkText>{t('Show more')}</LinkText>
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [needActionPendingTxps, needActionUnsentTxps],
  );

  const keyExtractor = useCallback(
    (item, index: number) => index.toString(),
    [],
  );

  const protocolName = getProtocolName(chain, network);

  return (
    <WalletDetailsContainer>
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
              <HeaderContainer>
                <BalanceContainer>
                  <TouchableOpacity
                    onLongPress={() => {
                      dispatch(toggleHideAllBalances());
                    }}>
                    {!fullWalletObj.isScanning ? (
                      <Row>
                        {!hideAllBalances ? (
                          <Balance scale={shouldScale(cryptoBalance)}>
                            {cryptoBalance}{' '}
                            {formatCurrencyAbbreviation(currencyAbbreviation)}
                          </Balance>
                        ) : (
                          <H2>****</H2>
                        )}
                      </Row>
                    ) : (
                      <View style={{padding: 12}}>
                        <Row>
                          <H5>{t('[Scanning Addresses]')}</H5>
                        </Row>
                        <Row>
                          <H5>{t('Please wait...')}</H5>
                        </Row>
                      </View>
                    )}
                    <Row>
                      {showFiatBalance &&
                        !hideAllBalances &&
                        !fullWalletObj.isScanning && (
                          <Paragraph>{fiatBalanceFormat}</Paragraph>
                        )}
                    </Row>
                  </TouchableOpacity>
                  {!hideAllBalances && showBalanceDetailsButton() && (
                    <TouchableRow
                      onPress={() => setShowBalanceDetailsModal(true)}>
                      <TimerSvg
                        width={28}
                        height={15}
                        fill={theme.dark ? White : Black}
                      />
                      <Small>
                        <Text style={{fontWeight: 'bold'}}>
                          {cryptoSpendableBalance}{' '}
                          {formatCurrencyAbbreviation(currencyAbbreviation)}
                        </Text>
                        {showFiatBalance && (
                          <Text> ({fiatSpendableBalanceFormat})</Text>
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
                    {protocolName ? (
                      <TypeContainer>
                        <IconContainer>
                          <Icons.Network />
                        </IconContainer>
                        <TypeText>{protocolName}</TypeText>
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
                    {['xrp', 'sol'].includes(
                      fullWalletObj?.currencyAbbreviation,
                    ) ? (
                      <TouchableOpacity
                        onPress={() => setShowBalanceDetailsModal(true)}>
                        <InfoSvg />
                      </TouchableOpacity>
                    ) : null}
                    {['xrp'].includes(fullWalletObj?.currencyAbbreviation) &&
                    Number(fullWalletObj?.balance?.cryptoConfirmedLocked) >=
                      10 ? (
                      <TypeContainer>
                        <TypeText>{t('Activated')}</TypeText>
                      </TypeContainer>
                    ) : null}
                  </Row>
                </BalanceContainer>

                {fullWalletObj ? (
                  <LinkingButtons
                    buy={{
                      hide:
                        fullWalletObj.network === 'testnet' ||
                        !isCoinSupportedToBuy(
                          fullWalletObj.currencyAbbreviation,
                          fullWalletObj.chain,
                          locationData?.countryShortCode || 'US',
                        ),
                      cta: () => {
                        dispatch(
                          Analytics.track('Clicked Buy Crypto', {
                            context: 'WalletDetails',
                            coin: fullWalletObj.currencyAbbreviation,
                            chain: fullWalletObj.chain || '',
                          }),
                        );
                        navigation.navigate(WalletScreens.AMOUNT, {
                          onAmountSelected: async (amount: string) => {
                            navigation.navigate('BuyCryptoRoot', {
                              amount: Number(amount),
                              fromWallet: fullWalletObj,
                            });
                          },
                          context: 'buyCrypto',
                        });
                      },
                    }}
                    sell={{
                      hide:
                        !fullWalletObj.balance.sat ||
                        (fullWalletObj.network === 'testnet' &&
                          fullWalletObj.currencyAbbreviation !== 'eth' &&
                          fullWalletObj.chain !== 'eth') ||
                        !isCoinSupportedToSell(
                          fullWalletObj.currencyAbbreviation,
                          fullWalletObj.chain,
                          locationData?.countryShortCode || 'US',
                        ),
                      cta: () => {
                        dispatch(
                          Analytics.track('Clicked Sell Crypto', {
                            context: 'WalletDetails',
                            coin: fullWalletObj.currencyAbbreviation,
                            chain: fullWalletObj.chain || '',
                          }),
                        );
                        navigation.navigate('SellCryptoRoot', {
                          fromWallet: fullWalletObj,
                        });
                      },
                    }}
                    swap={{
                      hide:
                        fullWalletObj.network === 'testnet' ||
                        !isCoinSupportedToSwap(
                          fullWalletObj.currencyAbbreviation,
                          fullWalletObj.chain,
                        ),
                      cta: () => {
                        dispatch(
                          Analytics.track('Clicked Swap Crypto', {
                            context: 'WalletDetails',
                            coin: fullWalletObj.currencyAbbreviation,
                            chain: fullWalletObj.chain || '',
                          }),
                        );
                        navigation.navigate('SwapCryptoRoot', {
                          selectedWallet: fullWalletObj,
                        });
                      },
                    }}
                    receive={{
                      cta: () => {
                        dispatch(
                          Analytics.track('Clicked Receive', {
                            context: 'WalletDetails',
                            coin: fullWalletObj.currencyAbbreviation,
                            chain: fullWalletObj.chain || '',
                          }),
                        );
                        setShowReceiveAddressBottomModal(true);
                      },
                    }}
                    send={{
                      hide: !fullWalletObj.balance.sat,
                      cta: () => {
                        dispatch(
                          Analytics.track('Clicked Send', {
                            context: 'WalletDetails',
                            coin: fullWalletObj.currencyAbbreviation,
                            chain: fullWalletObj.chain || '',
                          }),
                        );
                        navigation.navigate('SendTo', {wallet: fullWalletObj});
                      },
                    }}
                  />
                ) : null}
              </HeaderContainer>
              {pendingTxps && pendingTxps[0] ? (
                <>
                  <TransactionSectionHeaderContainer>
                    <H5>
                      {fullWalletObj.credentials.n > 1
                        ? t('Pending Proposals')
                        : t('Unsent Transactions')}
                    </H5>
                    <ProposalBadgeContainer onPress={onPressTxpBadge}>
                      <ProposalBadge>{pendingTxps.length}</ProposalBadge>
                    </ProposalBadgeContainer>
                  </TransactionSectionHeaderContainer>
                  {fullWalletObj.credentials.n > 1 &&
                  needActionPendingTxps.length > 0
                    ? renderTxp(needActionPendingTxps)
                    : needActionUnsentTxps.length > 0
                    ? renderTxp(needActionUnsentTxps)
                    : null}
                </>
              ) : null}

              {Number(cryptoLockedBalance) > 0 ? (
                <LockedBalanceContainer
                  onPress={() => setShowBalanceDetailsModal(true)}>
                  <HeadContainer>
                    <Description numberOfLines={1} ellipsizeMode={'tail'}>
                      {t('Total Locked Balance')}
                    </Description>
                  </HeadContainer>

                  <TailContainer>
                    <Value>
                      {cryptoLockedBalance}{' '}
                      {formatCurrencyAbbreviation(currencyAbbreviation)}
                    </Value>
                    <Fiat>
                      {network === 'testnet'
                        ? t('Test Only - No Value')
                        : fiatLockedBalanceFormat}
                    </Fiat>
                  </TailContainer>
                </LockedBalanceContainer>
              ) : null}
            </>
          );
        }}
        data={groupedHistory}
        keyExtractor={keyExtractor}
        renderItem={({item}) => {
          if (typeof item === 'string') {
            return (
              <TransactionSectionHeaderContainer>
                <H5>{item}</H5>
              </TransactionSectionHeaderContainer>
            );
          } else {
            return renderTransaction({item});
          }
        }}
        ItemSeparatorComponent={itemSeparatorComponent}
        ListFooterComponent={listFooterComponent}
        onMomentumScrollBegin={() => setIsScrolling(true)}
        onMomentumScrollEnd={() => setIsScrolling(false)}
        onEndReached={() => {
          if (isScrolling) {
            debouncedLoadHistory();
          }
        }}
        stickyHeaderIndices={
          groupedHistory
            .map((item, index) => {
              if (typeof item === 'string') {
                return index;
              } else {
                return null;
              }
            })
            .filter(item => item !== null) as number[]
        }
        getItemType={item =>
          typeof item === 'string' ? 'sectionHeader' : 'row'
        }
        onEndReachedThreshold={0.3}
        ListEmptyComponent={listEmptyComponent}
        estimatedItemSize={TRANSACTION_ROW_HEIGHT}
      />

      <OptionsSheet
        isVisible={showWalletOptions}
        closeModal={() => setShowWalletOptions(false)}
        title={t('WalletOptions')}
        options={getAssetOptions()}
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
      {showArchaxBanner && <ArchaxFooter />}
    </WalletDetailsContainer>
  );
};

export default WalletDetails;
