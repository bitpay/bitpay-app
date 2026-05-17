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
  useWindowDimensions,
} from 'react-native';
import {useStore} from 'react-redux';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import styled from 'styled-components/native';
import BalanceHistoryChart from '../../../components/charts/BalanceHistoryChart';
import {getTimeframeSelectorWidth} from '../../../components/charts/timeframeSelectorWidth';
import usePortfolioBalanceChartSurface from '../../../portfolio/ui/hooks/usePortfolioBalanceChartSurface';
import usePortfolioChartableWallets from '../../../portfolio/ui/hooks/usePortfolioChartableWallets';
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
import {maybePopulatePortfolioForWallets} from '../../../store/portfolio';
import {selectCanRenderPortfolioBalanceCharts} from '../../../store/portfolio/portfolio.selectors';
import {startUpdateWalletStatus} from '../../../store/wallet/effects/status/status';
import {
  buildUIFormattedWallet,
  findWalletById,
  isSegwit,
  isTaproot,
} from '../../../store/wallet/utils/wallet';
import {formatFiatAmount} from '../../../utils/helper-methods';
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
  Slate30,
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
import usePortfolioWalletSnapshotPresence from '../../../portfolio/ui/hooks/usePortfolioWalletSnapshotPresence';
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
import {getAssetTheme} from '../../../utils/portfolio/assetTheme';
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
import {ExternalServicesScreens} from '../../services/ExternalServicesGroup';
import {isTSSKey} from '../../../store/wallet/effects/tss-send/tss-send';
import {logManager} from '../../../managers/LogManager';
import type {RootState} from '../../../store';
import {
  getQuoteCurrency,
  walletsHaveNonZeroLiveBalance,
} from '../../../utils/portfolio/assets';

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
  margin: 18px 0 24px;
`;

const Row = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: flex-end;
`;

const CryptoBalanceRow = styled(Row)`
  margin-top: -5px;
`;

const TouchableRow = styled(TouchableOpacity)`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
`;

const BalanceContainer = styled.View`
  padding: 0 15px 22px;
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
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
  padding: 2px 5px;
  border-radius: 3px;
  margin: 10px 4px 0;
`;

const NetworkBadgeRow = styled(Row)`
  align-items: center;
  margin-top: 10px;
`;

const NetworkBadgeContainer = styled(TypeContainer)`
  margin: 0 4px 0 0;
`;

const IconContainer = styled.View`
  margin-right: 5px;
`;

const TypeText = styled(BaseText)`
  font-size: 12px;
  color: ${({theme: {dark}}) => (dark ? LuckySevens : SlateDark)};
`;

const CryptoBalanceText = styled(Paragraph)`
  font-size: 13px;
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
  const reduxStore = useStore();
  const theme = useTheme();
  const {width: windowWidth} = useWindowDimensions();
  const {t} = useTranslation();
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const {walletId, skipInitializeHistory, copayerId} = route.params;

  const {keys} = useAppSelector(({WALLET}) => WALLET);
  const {rates} = useAppSelector(({RATE}) => RATE);
  const supportedCardMap = useAppSelector(
    ({SHOP_CATALOG}) => SHOP_CATALOG.supportedCardMap,
  );
  const committedPortfolioQuoteCurrency = useAppSelector(
    ({PORTFOLIO}) => PORTFOLIO.quoteCurrency,
  );

  const locationData = useAppSelector(({LOCATION}) => LOCATION.locationData);
  const timeframeSelectorWidth = getTimeframeSelectorWidth(
    windowWidth,
    ScreenGutter,
  );

  const wallets = (Object.values(keys) as Key[]).flatMap(k => k.wallets);

  const contactList = useAppSelector(({CONTACT}) => CONTACT.list);
  const {defaultAltCurrency, hideAllBalances} = useAppSelector(({APP}) => APP);
  const canRenderPortfolioBalanceCharts = useAppSelector(
    selectCanRenderPortfolioBalanceCharts,
  );
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

  const getLatestWalletFromReduxState = useCallback(() => {
    const state = reduxStore.getState() as RootState;
    const latestKeys = state.WALLET.keys as Record<string, Key>;
    const latestWallets = (Object.values(latestKeys) as Key[]).flatMap(
      (walletKey: Key) => walletKey.wallets || [],
    );
    const latestWallet = findWalletById(latestWallets, walletId, copayerId) as
      | Wallet
      | undefined;

    return {
      state,
      wallet: latestWallet,
    };
  }, [copayerId, reduxStore, walletId]);

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
        dispatch(
          startUpdateWalletStatus({key, wallet: fullWalletObj, force: true}),
        ) as any,
        debouncedLoadHistory(true) as any,
        sleep(1000),
      ]);
      dispatch(updatePortfolioBalance());

      const {wallet: latestWallet} = getLatestWalletFromReduxState();
      setNeedActionTxps(latestWallet?.pendingTxps || []);

      if (latestWallet?.isScanning || fullWalletObj.isScanning) {
        // cancel scanning if user refreshes in case it's stuck
        dispatch(
          setWalletScanning({
            keyId: latestWallet?.keyId || key.id,
            walletId: latestWallet?.id || fullWalletObj.id,
            isScanning: false,
          }),
        );
      }

      await dispatch(
        maybePopulatePortfolioForWallets({
          walletIds: [latestWallet?.id || fullWalletObj.id],
          quoteCurrency: getQuoteCurrency({
            portfolioQuoteCurrency: committedPortfolioQuoteCurrency,
            defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
          }),
        }) as any,
      );
    } catch (err) {
      dispatch(showBottomNotificationModal(BalanceUpdateError()));
    } finally {
      setRefreshing(false);
    }
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
  const chartQuoteCurrency = useMemo(() => {
    return getQuoteCurrency({
      portfolioQuoteCurrency: committedPortfolioQuoteCurrency,
      defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
    });
  }, [committedPortfolioQuoteCurrency, defaultAltCurrency.isoCode]);
  const chartWallets = useMemo(() => [fullWalletObj], [fullWalletObj]);
  const chartableWallets = usePortfolioChartableWallets({
    wallets: chartWallets,
    enabled: canRenderPortfolioBalanceCharts,
  });
  const walletHasLiveBalance = useMemo(() => {
    return walletsHaveNonZeroLiveBalance(chartableWallets);
  }, [chartableWallets]);
  const canRenderWalletBalanceChart =
    canRenderPortfolioBalanceCharts && walletHasLiveBalance;
  const balanceChartSurface = usePortfolioBalanceChartSurface({
    wallets: chartableWallets,
    quoteCurrency: chartQuoteCurrency,
    fallbackCurrency: defaultAltCurrency.isoCode,
    enabled: canRenderWalletBalanceChart,
    resetKey: `${walletId}:${copayerId || ''}`,
  });

  const displayedFiatBalanceFormat =
    typeof balanceChartSurface.selectedBalance === 'number'
      ? formatFiatAmount(
          balanceChartSurface.selectedBalance,
          chartQuoteCurrency,
          {
            currencyDisplay: 'symbol',
            customPrecision: 'minimal',
          },
        )
      : fiatBalanceFormat;

  const showFiatBalance =
    // @ts-ignore
    Number(cryptoBalance.replaceAll(',', '')) > 0 &&
    network !== Network.testnet;
  const selectedChartCryptoBalance =
    balanceChartSurface.displayedAnalysisPoint?.totalCryptoBalanceFormatted;
  const selectedCryptoBalance =
    typeof balanceChartSurface.selectedBalance === 'number' &&
    typeof selectedChartCryptoBalance === 'string'
      ? selectedChartCryptoBalance
      : undefined;
  const formattedCryptoBalance = `${
    selectedCryptoBalance ?? cryptoBalance
  } ${formatCurrencyAbbreviation(currencyAbbreviation)}`;
  const assetTheme = useMemo(
    () =>
      getAssetTheme({
        currencyAbbreviation,
        chain,
        tokenAddress,
      }),
    [chain, currencyAbbreviation, tokenAddress],
  );
  const chartLineColor = useMemo(() => {
    const coinColor = assetTheme?.coinColor;
    if (!coinColor) {
      return undefined;
    }
    return theme.dark && coinColor === Black ? White : coinColor;
  }, [assetTheme, theme.dark]);
  const chartGradientBackgroundColor = useMemo(() => {
    return assetTheme?.gradientBackgroundColor;
  }, [assetTheme]);

  const [history, setHistory] = useState<any[]>([]);
  const [groupedHistory, setGroupedHistory] = useState<any[]>([]);
  const [loadMore, setLoadMore] = useState(true);
  const [isLoading, setIsLoading] = useState<boolean>();
  const [errorLoadingTxs, setErrorLoadingTxs] = useState<boolean>();
  const [needActionPendingTxps, setNeedActionPendingTxps] = useState<any[]>([]);
  const [needActionUnsentTxps, setNeedActionUnsentTxps] = useState<any[]>([]);
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const {hasAnySnapshots: walletHasSnapshots, checked: walletSnapshotsChecked} =
    usePortfolioWalletSnapshotPresence({
      wallets: chartableWallets,
      enabled: canRenderWalletBalanceChart,
    });
  const showWalletBalanceChart =
    canRenderWalletBalanceChart &&
    (!walletSnapshotsChecked || walletHasSnapshots);
  const walletChartChangeRowStyle = useMemo(() => ({marginTop: 2}), []);

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
        if (!refresh) {
          // Allow one frame for chart/list loaders to render before heavy history work.
          await sleep(0);
        }

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
        const errStr = e instanceof Error ? e.message : JSON.stringify(e);
        logManager.error(
          '[WalletDetails] Error loading transaction history: ' + errStr,
        );
        setLoadMore(false);
        setIsLoading(false);
        setErrorLoadingTxs(true);
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
    dispatch(updatePortfolioBalance());
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

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      DeviceEmitterEvents.SET_REFRESHING,
      val => {
        setRefreshing(!!val);
      },
    );
    return () => subscription.remove();
  }, []);

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
    const onTxDescriptionChange = () => debouncedLoadHistory(true);
    navigation.navigate('TransactionDetails', {
      wallet: fullWalletObj,
      transaction,
      onTxDescriptionChange,
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
      const errorMessageConfig = await dispatch(
        handleCreateTxProposalError(err),
      );
      dispatch(
        showBottomNotificationModal({
          ...errorMessageConfig,
          enableBackdropDismiss: true,
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
  const showEvmGasWalletBadge =
    !!fullWalletObj?.credentials?.token &&
    IsERCToken(
      String(currencyAbbreviation || '').toLowerCase(),
      String(chain || '').toLowerCase(),
    );
  const showActivatedBadge =
    ['xrp'].includes(fullWalletObj?.currencyAbbreviation) &&
    Number(fullWalletObj?.balance?.cryptoConfirmedLocked) >= 10;
  const showThresholdBadge =
    !IsShared(fullWalletObj) && isTSSKey(key) && !!fullWalletObj.tssMetadata;
  const showSpendableRow = !hideAllBalances && showBalanceDetailsButton();
  const hasBottomMetadataRow =
    (!!walletType && !showEvmGasWalletBadge) ||
    showThresholdBadge ||
    showActivatedBadge;
  const hasTopMetadataBadges =
    !!protocolName || showSpendableRow || hasBottomMetadataRow;
  const walletChartPreContent = useMemo(() => {
    if (!hasTopMetadataBadges) {
      return null;
    }

    return (
      <>
        {protocolName ? (
          <NetworkBadgeRow>
            {showEvmGasWalletBadge && walletType ? (
              <NetworkBadgeContainer>
                {walletType.icon ? (
                  <IconContainer>{walletType.icon}</IconContainer>
                ) : null}
                <TypeText>{walletType.title}</TypeText>
              </NetworkBadgeContainer>
            ) : null}
            <NetworkBadgeContainer>
              <IconContainer>
                <Icons.Network />
              </IconContainer>
              <TypeText>{protocolName}</TypeText>
            </NetworkBadgeContainer>
            {IsShared(fullWalletObj) ? (
              <NetworkBadgeContainer>
                <TypeText>
                  Multisig {fullWalletObj.m}/{fullWalletObj.n}
                </TypeText>
              </NetworkBadgeContainer>
            ) : null}
            {['xrp', 'sol'].includes(fullWalletObj?.currencyAbbreviation) ? (
              <TouchableOpacity
                onPress={() => setShowBalanceDetailsModal(true)}>
                <InfoSvg />
              </TouchableOpacity>
            ) : null}
          </NetworkBadgeRow>
        ) : null}
        {showSpendableRow ? (
          <TouchableRow onPress={() => setShowBalanceDetailsModal(true)}>
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
              {showFiatBalance && <Text> ({fiatSpendableBalanceFormat})</Text>}
            </Small>
          </TouchableRow>
        ) : null}
        {hasBottomMetadataRow ? (
          <Row>
            {walletType && !showEvmGasWalletBadge && (
              <TypeContainer>
                {walletType.icon ? (
                  <IconContainer>{walletType.icon}</IconContainer>
                ) : null}
                <TypeText>{walletType.title}</TypeText>
              </TypeContainer>
            )}
            {showThresholdBadge ? (
              <TypeContainer>
                <TypeText>
                  Threshold {fullWalletObj.tssMetadata?.m}/
                  {fullWalletObj.tssMetadata?.n}
                </TypeText>
              </TypeContainer>
            ) : null}
            {showActivatedBadge ? (
              <TypeContainer>
                <TypeText>{t('Activated')}</TypeText>
              </TypeContainer>
            ) : null}
          </Row>
        ) : null}
      </>
    );
  }, [
    cryptoSpendableBalance,
    currencyAbbreviation,
    fiatSpendableBalanceFormat,
    fullWalletObj,
    hasBottomMetadataRow,
    hasTopMetadataBadges,
    protocolName,
    showActivatedBadge,
    showEvmGasWalletBadge,
    showFiatBalance,
    showSpendableRow,
    showThresholdBadge,
    t,
    theme.dark,
    walletType,
  ]);

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
        ListHeaderComponent={
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
                        <Balance
                          scale={shouldScale(
                            showFiatBalance
                              ? displayedFiatBalanceFormat
                              : formattedCryptoBalance,
                          )}>
                          {showFiatBalance
                            ? displayedFiatBalanceFormat
                            : formattedCryptoBalance}
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
                  <CryptoBalanceRow>
                    {!hideAllBalances &&
                      !fullWalletObj.isScanning &&
                      showFiatBalance && (
                        <CryptoBalanceText>
                          {formattedCryptoBalance}
                        </CryptoBalanceText>
                      )}
                  </CryptoBalanceRow>
                </TouchableOpacity>

                {canRenderPortfolioBalanceCharts && !hideAllBalances ? (
                  showWalletBalanceChart ? (
                    <BalanceHistoryChart
                      wallets={chartableWallets}
                      quoteCurrency={chartQuoteCurrency}
                      rates={rates}
                      lineColor={chartLineColor}
                      gradientStartColor={chartGradientBackgroundColor}
                      showLoaderWhenNoSnapshots={
                        isLoading === undefined || !!isLoading || refreshing
                      }
                      onSelectedBalanceChange={
                        balanceChartSurface.chartCallbacks
                          .onSelectedBalanceChange
                      }
                      onDisplayedAnalysisPointChange={
                        balanceChartSurface.chartCallbacks
                          .onDisplayedAnalysisPointChange
                      }
                      timeframeSelectorWidth={timeframeSelectorWidth}
                      changeRowStyle={walletChartChangeRowStyle}
                      preChartContentTopMargin={12}
                      preChartContent={walletChartPreContent}
                    />
                  ) : walletChartPreContent ? (
                    <View style={{marginTop: 12}}>{walletChartPreContent}</View>
                  ) : null
                ) : null}
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
                      navigation.navigate(
                        ExternalServicesScreens.ROOT_BUY_AND_SELL,
                        {
                          context: 'buyCrypto',
                          fromWallet: fullWalletObj,
                        },
                      );
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
                      navigation.navigate(
                        ExternalServicesScreens.ROOT_BUY_AND_SELL,
                        {
                          context: 'sellCrypto',
                          fromWallet: fullWalletObj,
                        },
                      );
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
        }
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
