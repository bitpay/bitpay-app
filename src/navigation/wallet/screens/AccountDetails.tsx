import {CommonActions, useNavigation, useTheme} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
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
import {useStore} from 'react-redux';
import {RootState} from '../../../store';
import {useTranslation} from 'react-i18next';
import {WalletGroupParamList} from '../WalletGroup';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  Key,
  Wallet,
  TransactionProposal,
  KeyMethods,
} from '../../../store/wallet/wallet.models';
import {
  KeyToggle as AccountToogle,
  KeyDropdown as AccountDropdown,
  KeyDropdownOptionsContainer as AccountDropdownOptionsContainer,
} from './KeyOverview';
import {
  DeviceEventEmitter,
  RefreshControl,
  SafeAreaView,
  SectionList,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import {
  TouchableOpacity,
  TouchableOpacityProps,
} from '@components/base/TouchableOpacity';
import BalanceHistoryChart from '../../../components/charts/BalanceHistoryChart';
import BalanceChartLoadingPlaceholder from '../../../components/charts/BalanceChartLoadingPlaceholder';
import BalanceHeaderSupplement from '../../../components/charts/BalanceHeaderSupplement';
import FullWidthBalanceChartContainer from '../../../components/charts/FullWidthBalanceChartContainer';
import {getTimeframeSelectorWidth} from '../../../components/charts/timeframeSelectorWidth';
import {DEFAULT_BALANCE_CHART_TIMEFRAME} from '../../../components/charts/fiatTimeframes';
import {useHasCachedBalanceHistoryChartSeries} from '../../../components/charts/balanceHistoryChartSeriesCache';
import useLegacyLastDayChangeRowData from '../../../components/charts/useLegacyLastDayChangeRowData';
import usePortfolioBalanceChartSurface from '../../../portfolio/ui/hooks/usePortfolioBalanceChartSurface';
import usePortfolioBalanceChartReadiness from '../../../portfolio/ui/hooks/usePortfolioBalanceChartReadiness';
import usePortfolioBalanceChartEligibleWallets from '../../../portfolio/ui/hooks/usePortfolioBalanceChartEligibleWallets';
import {
  Badge,
  Balance,
  BaseText,
  H2,
  H5,
  HeaderTitle,
  Link,
  ProposalBadge,
} from '../../../components/styled/Text';
import {
  setLocalAssetsDropdown,
  showBottomNotificationModal,
  toggleHideAllBalances,
  setDefaultChainFilterOption,
} from '../../../store/app/app.actions';
import {selectShowPortfolioValue} from '../../../store/app/app.selectors';
import {maybePopulatePortfolioForWallets} from '../../../store/portfolio';
import {
  formatCryptoAddress,
  formatCurrencyAbbreviation,
  formatFiatAmount,
  shouldScale,
  sleep,
  fixWalletAddresses,
} from '../../../utils/helper-methods';
import LinkingButtons from '../../tabs/home/components/LinkingButtons';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {Air, LightBlack, SlateDark, White} from '../../../styles/colors';
import {
  createMultipleWallets,
  getActiveWalletStoreInitPromise,
  getDecryptPassword,
  startGetRates,
  serverAssistedImport,
  normalizeMnemonic,
} from '../../../store/wallet/effects';
import {startUpdateAllWalletStatusForKey} from '../../../store/wallet/effects/status/status';
import {
  successAddWallet,
  updatePortfolioBalance,
  syncWallets,
} from '../../../store/wallet/wallet.actions';
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
import WalletRow, {WalletRowProps} from '../../../components/list/WalletRow';
import {AssetsByChainHeader} from '../../../components/list/AssetsByChainRow';
import {
  buildVirtualizedAssetsByChainSections,
  VirtualizedAssetsByChainSection,
} from '../../../components/list/assetsByChainSections';
import {
  ActiveOpacity,
  BadgeContainerTouchable,
  ChevronContainer,
  EmptyListContainer,
  HeaderRightContainer,
  ProposalBadgeContainer,
  ScreenGutter,
} from '../../../components/styled/Containers';
import SearchComponent, {
  SearchableItem,
} from '../../../components/chain-search/ChainSearch';
import CopySvg from '../../../../assets/img/copy.svg';
import SentBadgeSvg from '../../../../assets/img/sent-badge.svg';
import CopiedSvg from '../../../../assets/img/copied-success.svg';
import Icons from '../components/WalletIcons';
import EncryptPasswordDarkModeImg from '../../../../assets/img/tinyicon-encrypt-darkmode.svg';
import EncryptPasswordImg from '../../../../assets/img/tinyicon-encrypt.svg';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import haptic from '../../../components/haptic-feedback/haptic';
import Clipboard from '@react-native-clipboard/clipboard';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import CoinbaseDropdownOption from '../components/CoinbaseDropdownOption';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../tabs/TabsStack';
import {CoinbaseScreens} from '../../coinbase/CoinbaseGroup';
import DropdownOption from '../components/DropdownOption';
import TransactionRow, {
  TRANSACTION_ROW_HEIGHT,
} from '../../../components/list/TransactionRow';
import ContactIcon from '../../tabs/contacts/components/ContactIcon';
import {
  TRANSACTION_ICON_SIZE,
  TransactionIcons,
} from '../../../constants/TransactionIcons';
import {getGiftCardIcons} from '../../../lib/gift-cards/gift-card';
import {BillPayAccount} from '../../../store/shop/shop.models';
import {
  CanSpeedupTx,
  GetAccountTransactionHistory,
  GroupTransactionHistory,
  IsMoved,
  IsReceived,
  TX_HISTORY_LIMIT,
} from '../../../store/wallet/effects/transactions/transactions';
import {
  buildBtcSpeedupTx,
  buildEthERCTokenSpeedupTx,
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
} from '../../../store/wallet/effects/send/send';
import debounce from 'lodash.debounce';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';
import GhostSvg from '../../../../assets/img/ghost-straight-face.svg';
import WalletTransactionSkeletonRow from '../../../components/list/WalletTransactionSkeletonRow';
import {
  buildAccountList,
  buildAssetsByChainList,
  getWalletAccountVisibilityKey,
  findWalletById,
  buildWalletObj,
  isWalletVisibleForKey,
  mapAbbreviationAndName,
  checkPrivateKeyEncrypted,
} from '../../../store/wallet/utils/wallet';
import {
  DeviceEmitterEvents,
  WalletLoadHistoryTarget,
} from '../../../constants/device-emitter-events';
import ChevronDownSvgLight from '../../../../assets/img/chevron-down-lightmode.svg';
import ChevronDownSvgDark from '../../../../assets/img/chevron-down-darkmode.svg';
import KeySvg from '../../../../assets/img/key.svg';
import ReceiveAddress from '../components/ReceiveAddress';
import {IsVMChain} from '../../../store/wallet/utils/currency';
import uniqBy from 'lodash.uniqby';
import OptionsSheet, {Option} from '../components/OptionsSheet';
import Settings from '../../../components/settings/Settings';
import {
  BitpaySupportedEvmCoins,
  BitpaySupportedSvmCoins,
  getBaseEVMAccountCreationCoinsAndTokens,
} from '../../../constants/currencies';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {BitpaySupportedTokenOptsByAddress} from '../../../constants/tokens';
import {useOngoingProcess, useTokenContext} from '../../../contexts';
import {logManager} from '../../../managers/LogManager';
import {ExternalServicesScreens} from '../../services/ExternalServicesGroup';
import {AllocationDonutLegendCard} from '../../tabs/home/components/AllocationSection';
import {AllocationRowsList} from '../../tabs/home/screens/Allocation';
import {buildAllocationDataFromWalletRows} from '../../../utils/portfolio/allocation';
import {getQuoteCurrency} from '../../../utils/portfolio/assets';
import ArchaxFooter from '../../../components/archax/archax-footer';
import {formatUnknownError} from '../../../utils/errors/formatUnknownError';
import ThresholdBadge from '../../../components/threshold-badge/ThresholdBadge';

export type AccountDetailsScreenParamList = {
  selectedAccountAddress: string;
  keyId: string;
  skipInitializeHistory?: boolean;
  isSvmAccount?: boolean;
};

type AccountDetailsScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
  'AccountDetails'
>;

export interface AssetsByChainData {
  id: string;
  chain: string;
  chainName: string;
  chainImg: string | ((props?: any) => ReactElement);
  chainAssetsList: WalletRowProps[];
  accountAddress: string;
  fiatBalance: number;
  fiatLockedBalance: number;
  fiatConfirmedLockedBalance: number;
  fiatSpendableBalance: number;
  fiatPendingBalance: number;
  fiatBalanceFormat: string;
  fiatLockedBalanceFormat: string;
  fiatConfirmedLockedBalanceFormat: string;
  fiatSpendableBalanceFormat: string;
  fiatPendingBalanceFormat: string;
}

export interface AssetsByChainListProps extends SearchableItem {
  title: string;
  chains: string[]; // only used for filter
  data: AssetsByChainData[];
}

type AccountDetailsTab = 'wallets' | 'allocation' | 'activity';

export interface GroupedHistoryProps extends SearchableItem {
  title: string;
  data: TransactionProposal[];
  time: number;
}

const transactionItemLayout = (_data: any, index: number) => ({
  length: TRANSACTION_ROW_HEIGHT,
  offset: TRANSACTION_ROW_HEIGHT * index,
  index,
});

const styles = StyleSheet.create({
  borderBottom: {
    borderBottomWidth: 1,
  },
  accountDetailsContainer: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  walletListHeader: {
    padding: 10,
  },
  copyToClipboardContainer: {
    justifyContent: 'center',
    height: 20,
  },
  headerContainer: {
    marginTop: 18,
    marginBottom: 24,
  },
  transactionSectionHeaderContainer: {
    padding: parseInt(ScreenGutter, 10),
    height: 55,
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skeletonContainer: {
    marginBottom: 20,
  },
  lockedBalanceContainer: {
    flexDirection: 'row',
    padding: parseInt(ScreenGutter, 10),
    justifyContent: 'center',
    alignItems: 'center',
    height: 75,
  },
  description: {
    overflow: 'hidden',
    marginRight: 175,
    fontSize: 16,
  },
  tailContainer: {
    marginLeft: 'auto',
  },
  value: {
    textAlign: 'right',
    fontWeight: '700',
    fontSize: 16,
  },
  balanceContainer: {
    paddingTop: 0,
    paddingHorizontal: 15,
    paddingBottom: 22,
    flexDirection: 'column',
  },
  hiddenChart: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
  assetsDataContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerListContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  addCustomTokenContainer: {
    margin: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredText: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
    marginLeft: 4,
  },
  accountMetadataRow: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});

const BorderBottom = () => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.borderBottom,
        {borderBottomColor: theme.dark ? LightBlack : Air},
      ]}
    />
  );
};

const Row: React.FC<{
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}> = ({style, children}) => <View style={[styles.row, style]}>{children}</View>;

const WalletListHeader: React.FC<TouchableOpacityProps> = ({
  style,
  ...props
}) => <TouchableOpacity style={[styles.walletListHeader, style]} {...props} />;

const WalletListHeaderLabel: React.FC<{
  isActive: boolean;
  children?: React.ReactNode;
}> = ({isActive, children}) => (
  <View style={{opacity: isActive ? 1 : 0.4}}>{children}</View>
);

const CopyToClipboardContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.copyToClipboardContainer}>{children}</View>;

const HeaderContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.headerContainer}>{children}</View>;

const TransactionSectionHeaderContainer: React.FC<{
  children?: React.ReactNode;
}> = ({children}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.transactionSectionHeaderContainer,
        {backgroundColor: theme.dark ? LightBlack : '#F5F6F7'},
      ]}>
      {children}
    </View>
  );
};

const SkeletonContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.skeletonContainer}>{children}</View>;

const LockedBalanceContainer: React.FC<TouchableOpacityProps> = ({
  style,
  ...props
}) => (
  <TouchableOpacity style={[styles.lockedBalanceContainer, style]} {...props} />
);

const Description: React.FC<React.ComponentProps<typeof BaseText>> = props => (
  <BaseText {...props} style={[styles.description, props.style]} />
);

const TailContainer: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.tailContainer}>{children}</View>
);

const Value: React.FC<React.ComponentProps<typeof BaseText>> = props => (
  <BaseText {...props} style={[styles.value, props.style]} />
);

const BalanceContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.balanceContainer}>{children}</View>;

const AssetsDataContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.assetsDataContainer}>{children}</View>;

const HeaderListContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.headerListContainer}>{children}</View>;

const AddCustomTokenContainer: React.FC<TouchableOpacityProps> = ({
  style,
  ...props
}) => (
  <TouchableOpacity
    style={[styles.addCustomTokenContainer, style]}
    {...props}
  />
);

const CenteredText: React.FC<React.ComponentProps<typeof BaseText>> = props => {
  const theme = useTheme();
  return (
    <BaseText
      {...props}
      style={[
        styles.centeredText,
        {color: theme.dark ? White : SlateDark},
        props.style,
      ]}
    />
  );
};

type AccountAddressBadgeProps = {
  address?: string;
};

const AccountAddressBadge = ({address}: AccountAddressBadgeProps) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(() => {
    haptic('impactLight');
    if (!copied && address) {
      Clipboard.setString(address);
      setCopied(true);
    }
  }, [address, copied]);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => {
      setCopied(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <BadgeContainerTouchable
      onPress={copyToClipboard}
      activeOpacity={ActiveOpacity}
      style={{alignSelf: 'center', width: 'auto', height: 25}}>
      <Badge>{formatCryptoAddress(address)}</Badge>
      <CopyToClipboardContainer>
        {!copied ? <CopySvg width={10} /> : <CopiedSvg width={10} />}
      </CopyToClipboardContainer>
    </BadgeContainerTouchable>
  );
};

const AccountDetails: React.FC<AccountDetailsScreenProps> = ({route}) => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const reduxStore = useStore();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const {tokenOptionsByAddress} = useTokenContext();
  const theme = useTheme();
  const {width: windowWidth} = useWindowDimensions();
  const {selectedAccountAddress, keyId, isSvmAccount} = route.params;
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const showPortfolioValue = useAppSelector(selectShowPortfolioValue);
  const contactList = useAppSelector(({CONTACT}) => CONTACT.list);
  const {t} = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [renderedAccountChartIdentity, setRenderedAccountChartIdentity] =
    useState<string>();
  const key = useAppSelector(
    ({WALLET}: RootState) => WALLET.keys[keyId],
  ) as Key;
  const [searchVal, setSearchVal] = useState('');
  const [activeTab, setActiveTab] = useState<AccountDetailsTab>('wallets');

  useEffect(() => {
    let completed = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    const finishOpeningTransition = () => {
      if (completed) {
        return;
      }

      completed = true;
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      setContentReady(true);
    };

    const unsubscribe = (navigation as any).addListener(
      'transitionEnd',
      (event: {data?: {closing?: boolean}}) => {
        if (!event.data?.closing) {
          finishOpeningTransition();
        }
      },
    );
    fallbackTimer = setTimeout(finishOpeningTransition, 700);

    return () => {
      completed = true;
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      unsubscribe();
    };
  }, [navigation]);

  useEffect(() => {
    if (!showPortfolioValue && activeTab === 'allocation') {
      setActiveTab('wallets');
    }
  }, [activeTab, showPortfolioValue]);

  const selectedChainFilterOption = useAppSelector(
    ({APP}) => APP.selectedChainFilterOption,
  );
  const selectedAccountAssetsDropdown = useAppSelector(
    ({APP}) => APP.selectedLocalAssetsDropdown?.[selectedAccountAddress],
  );
  const isSmallScreen = windowWidth < 400;
  const timeframeSelectorWidth = getTimeframeSelectorWidth(
    windowWidth,
    ScreenGutter,
  );
  const network = useAppSelector(({APP}) => APP.network);
  const [accountTransactionsHistory, setAccountTransactionsHistory] = useState<{
    [key: string]: {
      transactions: any[];
      loadMore: boolean;
      hasConfirmingTxs: boolean;
    };
  }>({});
  const [groupedHistory, setGroupedHistory] = useState<GroupedHistoryProps[]>(
    [],
  );
  const [loadMoreIndex, setLoadMoreIndex] = useState(1);
  const [loadMore, setLoadMore] = useState(true);
  const [isLoading, setIsLoading] = useState<boolean>();
  const [errorLoadingTxs, setErrorLoadingTxs] = useState<boolean>();
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const supportedCardMap = useAppSelector(
    ({SHOP_CATALOG}) => SHOP_CATALOG.supportedCardMap,
  );
  const [showReceiveAddressBottomModal, setShowReceiveAddressBottomModal] =
    useState(false);
  const rates = useAppSelector(({RATE}) => RATE.rates);
  const committedPortfolioQuoteCurrency = useAppSelector(
    ({PORTFOLIO}) => PORTFOLIO.quoteCurrency,
  );
  const [showKeyOptions, setShowKeyOptions] = useState(false);

  const [searchResultsHistory, setSearchResultsHistory] = useState(
    [] as GroupedHistoryProps[],
  );
  const [searchResultsAssets, setSearchResultsAssets] = useState(
    [] as AssetsByChainListProps[],
  );
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const linkedCoinbase = useAppSelector(
    ({COINBASE}) => !!COINBASE.token[COINBASE_ENV],
  );

  const keyFullWalletObjs = useMemo<Wallet[]>(
    () =>
      uniqBy(
        key.wallets.filter(
          (w: Wallet) => w.receiveAddress === selectedAccountAddress,
        ),
        (wallet: Wallet) => {
          return wallet.id;
        },
      ),
    [key, selectedAccountAddress],
  );
  const tssMetadata = useMemo(
    () => keyFullWalletObjs.find(wallet => wallet.tssKeyId)?.tssMetadata,
    [keyFullWalletObjs],
  );
  const displayQuoteCurrency = getQuoteCurrency({
    portfolioQuoteCurrency: committedPortfolioQuoteCurrency,
    defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
  });
  const cacheEligibleAccountWallets = usePortfolioBalanceChartEligibleWallets({
    wallets: keyFullWalletObjs,
    enabled: showPortfolioValue === true && !hideAllBalances,
  });
  const accountChartWalletIds = useMemo(
    () =>
      cacheEligibleAccountWallets
        .map(wallet => wallet.id)
        .filter(Boolean)
        .sort(),
    [cacheEligibleAccountWallets],
  );
  const accountChartIdentity = `${accountChartWalletIds.join(
    ',',
  )}|${displayQuoteCurrency}|${DEFAULT_BALANCE_CHART_TIMEFRAME}`;
  const hasCachedAccountChart = useHasCachedBalanceHistoryChartSeries({
    walletIds: accountChartWalletIds,
    quoteCurrency: displayQuoteCurrency,
    timeframe: DEFAULT_BALANCE_CHART_TIMEFRAME,
  });
  const {
    shouldMountBalanceChart: shouldMountAccountBalanceChart,
    shouldShowChartLoader: shouldShowAccountChartLoader,
    shouldRenderZeroBalanceChart: shouldRenderZeroAccountBalanceChart,
    shouldPreserveStaleBalanceChart: shouldPreserveStaleAccountBalanceChart,
    isBalanceChartDataReadyToQuery: isAccountBalanceChartDataReadyToQuery,
    chartableWallets: chartableAccountWallets,
  } = usePortfolioBalanceChartReadiness({
    wallets: cacheEligibleAccountWallets,
    enabled:
      (contentReady || hasCachedAccountChart) && showPortfolioValue === true,
    hideAllBalances,
    renderZeroBalanceChartWhenNoSnapshots: true,
  });
  const shouldRenderAccountBalanceChart =
    shouldMountAccountBalanceChart || hasCachedAccountChart;
  const accountWalletIds = useMemo(
    () => keyFullWalletObjs.map(wallet => wallet.id).filter(Boolean),
    [keyFullWalletObjs],
  );
  const pendingProposalsCount = useMemo(
    () =>
      keyFullWalletObjs.reduce(
        (count, wallet) => count + (wallet.pendingTxps.length > 0 ? 1 : 0),
        0,
      ),
    [keyFullWalletObjs],
  );
  const activeAccountList = useMemo(() => {
    return (
      buildAccountList(key, defaultAltCurrency.isoCode, rates, dispatch, {
        filterByHideWallet: true,
        filterByCustomWallets: keyFullWalletObjs,
      }).filter(({chains}) => IsVMChain(chains[0])) || {}
    );
  }, [dispatch, key, keyFullWalletObjs, defaultAltCurrency.isoCode, rates]);

  const hasMultipleAccounts = useMemo(() => {
    const visibleAccountKeys = new Set<string>();

    for (const wallet of key.wallets) {
      if (!IsVMChain(wallet.chain) || !isWalletVisibleForKey(key, wallet)) {
        continue;
      }

      visibleAccountKeys.add(getWalletAccountVisibilityKey(wallet));
      if (visibleAccountKeys.size > 1) {
        return true;
      }
    }

    return false;
  }, [key]);

  const accountDropdownListRef =
    useRef<typeof activeAccountList>(activeAccountList);
  const accountDropdownList = useMemo(() => {
    if (!showAccountDropdown) {
      return accountDropdownListRef.current;
    }

    const accountsForDropdown = buildAccountList(
      key,
      defaultAltCurrency.isoCode,
      rates,
      dispatch,
      {filterByHideWallet: true},
    ).filter(({chains}) => IsVMChain(chains[0]));

    accountDropdownListRef.current = accountsForDropdown;
    return accountsForDropdown;
  }, [defaultAltCurrency.isoCode, dispatch, key, rates, showAccountDropdown]);

  useEffect(() => {
    if (!isSmallScreen || !showPortfolioValue) {
      return;
    }

    if (selectedChainFilterOption) {
      dispatch(setDefaultChainFilterOption(undefined));
    }
  }, [dispatch, isSmallScreen, selectedChainFilterOption, showPortfolioValue]);

  const accountItem = useMemo(
    () =>
      activeAccountList.find(
        account => account.receiveAddress === selectedAccountAddress,
      )!,
    [activeAccountList, selectedAccountAddress],
  );
  const balanceChartSurface = usePortfolioBalanceChartSurface({
    wallets: chartableAccountWallets,
    quoteCurrency: displayQuoteCurrency,
    fallbackCurrency: defaultAltCurrency.isoCode,
    enabled: shouldRenderAccountBalanceChart,
    isBalanceChartDataReadyToQuery: isAccountBalanceChartDataReadyToQuery,
    preserveChartDrivenStateWhileNotReady:
      shouldPreserveStaleAccountBalanceChart || hasCachedAccountChart,
    resetKey: `${keyId}:${selectedAccountAddress || ''}`,
  });
  const totalBalance =
    typeof balanceChartSurface.selectedBalance === 'number'
      ? formatFiatAmount(
          balanceChartSurface.selectedBalance,
          displayQuoteCurrency,
          {
            currencyDisplay: 'symbol',
          },
        )
      : accountItem?.fiatBalanceFormat;
  const legacyLastDayChangeRowData = useLegacyLastDayChangeRowData({
    wallets: keyFullWalletObjs,
    currentFiatBalance: accountItem?.fiatBalance,
    quoteCurrency: defaultAltCurrency.isoCode,
    enabled: showPortfolioValue !== true && !hideAllBalances,
  });
  const accountHeaderChangeRowData =
    showPortfolioValue === true
      ? balanceChartSurface.changeRowData
      : legacyLastDayChangeRowData;
  const hasRenderedAccountChart =
    renderedAccountChartIdentity === accountChartIdentity ||
    hasCachedAccountChart;
  const shouldShowAccountChartPlaceholder =
    showPortfolioValue === true &&
    !hideAllBalances &&
    !hasRenderedAccountChart &&
    !hasCachedAccountChart &&
    cacheEligibleAccountWallets.length > 0;
  const onAccountChartRenderableSeriesChange = useCallback(
    (hasRenderableSeries: boolean) => {
      if (hasRenderableSeries) {
        setRenderedAccountChartIdentity(accountChartIdentity);
      }
    },
    [accountChartIdentity],
  );
  const accountChartPreContent = useMemo(
    () => (
      <View style={styles.accountMetadataRow}>
        <AccountAddressBadge address={accountItem?.receiveAddress} />
        {tssMetadata ? (
          <ThresholdBadge m={tssMetadata.m} n={tssMetadata.n} size={'list'} />
        ) : null}
      </View>
    ),
    [accountItem?.receiveAddress, tssMetadata],
  );

  const accounts = useAppSelector(
    ({SHOP}) => SHOP.billPayAccounts[accountItem?.wallets[0]?.network],
  ) as BillPayAccount[] | undefined;
  const billPayIconByMerchantId = useMemo(() => {
    return (accounts || []).reduce<Record<string, string>>(
      (iconByMerchantId, account) => {
        const accountDetails = account[account.type];
        if (accountDetails?.merchantId && accountDetails.merchantIcon) {
          iconByMerchantId[accountDetails.merchantId] =
            accountDetails.merchantIcon;
        }
        return iconByMerchantId;
      },
      {},
    );
  }, [accounts]);
  const giftCardIcons = useMemo(
    () => getGiftCardIcons(supportedCardMap),
    [supportedCardMap],
  );

  const startSyncWallets = async (mnemonic: string) => {
    const {customTokenOptionsByAddress} = (reduxStore.getState() as RootState)
      .WALLET;
    const tokenOptionsForSync = {
      ...BitpaySupportedTokenOptsByAddress,
      ...tokenOptionsByAddress,
      ...customTokenOptionsByAddress,
    };

    if (key.isPrivKeyEncrypted) {
      // To close decrypt modal
      await sleep(500);
    }
    showOngoingProcess('SYNCING_WALLETS');
    const opts = {
      words: normalizeMnemonic(mnemonic),
      mnemonic,
    };
    try {
      let {key: _syncKey, wallets: _syncWallets} = await serverAssistedImport(
        opts,
      );

      if (_syncKey.fingerPrint === key.properties!.fingerPrint) {
        // Filter for new wallets
        _syncWallets = _syncWallets
          .filter(
            sw =>
              sw.isComplete() &&
              !sw.pendingTssSession &&
              !key.wallets.some(ew => ew.id === sw.credentials.walletId),
          )
          .map(syncWallet => {
            // update to keyId
            syncWallet.credentials.keyId = key.properties!.id;
            const {currencyAbbreviation, currencyName} = dispatch(
              mapAbbreviationAndName(
                syncWallet.credentials.coin,
                syncWallet.credentials.chain,
                syncWallet.credentials.token?.address,
              ),
            );
            return _.merge(
              syncWallet,
              buildWalletObj(
                {
                  ...syncWallet.credentials,
                  currencyAbbreviation,
                  currencyName,
                } as any,
                tokenOptionsForSync,
              ),
            );
          });

        // workaround for fixing wallets without receive address
        await fixWalletAddresses({
          appDispatch: dispatch,
          wallets: _syncWallets,
        });

        let message;

        const syncWalletsLength = _syncWallets.length;
        if (syncWalletsLength) {
          message =
            syncWalletsLength === 1
              ? t('New wallet found')
              : t('wallets found', {syncWalletsLength});
          dispatch(syncWallets({keyId: key.id, wallets: _syncWallets}));
        } else {
          message = t('Your key is already synced');
        }

        hideOngoingProcess();
        await sleep(500);
        dispatch(
          showBottomNotificationModal({
            type: 'success',
            title: t('Sync wallet'),
            message,
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
      } else {
        hideOngoingProcess();
        await sleep(500);
        await dispatch(
          showBottomNotificationModal(
            CustomErrorMessage({
              errMsg: t('Failed to Sync wallets'),
            }),
          ),
        );
      }
    } catch (e) {
      hideOngoingProcess();
      await sleep(500);
      await dispatch(
        showBottomNotificationModal(
          CustomErrorMessage({
            errMsg: BWCErrorMessage(e),
            title: t('Error'),
          }),
        ),
      );
    }
  };

  const keyOptions: Array<Option> = [];
  const hasAllChains =
    accountItem?.chains?.length ===
    Object.keys(
      isSvmAccount ? BitpaySupportedSvmCoins : BitpaySupportedEvmCoins,
    ).length;
  if (!isSvmAccount && !hasAllChains) {
    keyOptions.push({
      img: <Icons.Wallet width="15" height="15" />,
      title: t('Add Ethereum Networks'),
      description: t('Add all the supported networks to this account.'),
      onPress: async () => {
        haptic('impactLight');
        await sleep(500);
        const _key = key.methods as KeyMethods;
        let password: string | undefined;
        if (key.isPrivKeyEncrypted) {
          password = await dispatch(getDecryptPassword(Object.assign({}, key)));
        }
        showOngoingProcess('ADDING_EVM_CHAINS');
        const wallets = await dispatch(
          createMultipleWallets({
            key: _key,
            currencies: getBaseEVMAccountCreationCoinsAndTokens(),
            options: {
              network,
              password,
              account: accountItem?.accountNumber,
              customAccount: true,
            },
          }),
        );
        if (_.isEmpty(wallets)) {
          if (!key.isPrivKeyEncrypted) {
            await startSyncWallets(key.properties!.mnemonic);
          } else {
            const mnemonic = key.methods!.get(password).mnemonic;
            await startSyncWallets(mnemonic);
          }
        } else {
          key.wallets.push(...(wallets as Wallet[]));
          dispatch(successAddWallet({key}));
        }
        hideOngoingProcess();
      },
    });
  }
  keyOptions.push({
    img: <Icons.Settings />,
    title: t('Account Settings'),
    description: t('View all the ways to manage and configure your account.'),
    onPress: () => {
      haptic('impactLight');
      navigation.navigate('AccountSettings', {
        keyId: key.id,
        selectedAccountAddress: accountItem?.receiveAddress,
        context: 'accountDetails',
        isSvmAccount,
      });
    },
  });

  const loadHistory = useCallback(
    async (
      _selectedChainFilterOption: string | undefined,
      refresh?: boolean,
    ) => {
      if (!loadMore && !refresh) {
        return;
      }
      try {
        setIsLoading(true);
        setErrorLoadingTxs(false);

        const transactionHistory = await dispatch(
          GetAccountTransactionHistory({
            wallets: keyFullWalletObjs,
            accountTransactionsHistory,
            keyId: key.id,
            limit: TX_HISTORY_LIMIT * loadMoreIndex,
            contactList,
            refresh,
            selectedChainFilterOption: _selectedChainFilterOption,
          }),
        );

        setLoadMoreIndex(currentIndex => currentIndex + 1);
        if (transactionHistory) {
          const {
            accountTransactionsHistory: nextAccountTransactionsHistory,
            sortedCompleteHistory,
          } = transactionHistory;

          setAccountTransactionsHistory(nextAccountTransactionsHistory);

          if (sortedCompleteHistory?.length) {
            setGroupedHistory(GroupTransactionHistory(sortedCompleteHistory));
          } else {
            setGroupedHistory([]);
          }

          const hasLoadMore = Object.values(
            nextAccountTransactionsHistory,
          ).some(({loadMore: walletHasMore}) => walletHasMore);
          setLoadMore(hasLoadMore);
        }

        setIsLoading(false);
      } catch (e) {
        const errStr = e instanceof Error ? e.message : JSON.stringify(e);
        logManager.error(
          '[AccountDetails] Error loading transaction history: ' + errStr,
        );
        setLoadMore(false);
        setIsLoading(false);
        setErrorLoadingTxs(true);
      }
    },
    [
      accountTransactionsHistory,
      contactList,
      dispatch,
      key.id,
      keyFullWalletObjs,
      loadMore,
      loadMoreIndex,
    ],
  );

  const debouncedLoadHistory = useMemo(() => {
    const debounced = debounce(
      (_selectedChainFilterOption: string | undefined, refresh?: boolean) => {
        loadHistory(_selectedChainFilterOption, refresh);
      },
      300,
      {leading: true},
    );
    return debounced;
  }, [loadHistory]);

  const loadHistoryRef = useRef(debouncedLoadHistory);

  useEffect(() => {
    loadHistoryRef.current = debouncedLoadHistory;

    return () => {
      debouncedLoadHistory.cancel();
    };
  }, [debouncedLoadHistory]);

  const updateWalletStatusAndProfileBalance = async () => {
    const activeStartupInit = getActiveWalletStoreInitPromise();
    if (activeStartupInit) {
      const {walletInitSuccess} = await activeStartupInit;
      if (walletInitSuccess) {
        return;
      }
    }

    await dispatch(
      startUpdateAllWalletStatusForKey({
        key,
        accountAddress: accountItem?.receiveAddress,
        force: false,
      }),
    );
    if (key.isReadOnly) {
      dispatch(updatePortfolioBalance());
    }
  };
  const updateWalletStatusAndProfileBalanceRef = useRef(
    updateWalletStatusAndProfileBalance,
  );
  updateWalletStatusAndProfileBalanceRef.current =
    updateWalletStatusAndProfileBalance;

  useEffect(() => {
    dispatch(Analytics.track('View Account'));
  }, [dispatch]);

  useEffect(() => {
    if (!contentReady) {
      return;
    }

    const timer = setTimeout(() => {
      if (navigation.isFocused()) {
        updateWalletStatusAndProfileBalanceRef.current();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [contentReady, navigation]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      DeviceEmitterEvents.WALLET_LOAD_HISTORY,
      (payload?: string | WalletLoadHistoryTarget) => {
        if (
          typeof payload === 'object' &&
          (payload.historyContext !== 'account' ||
            payload.keyId !== key.id ||
            !keyFullWalletObjs.some(
              wallet =>
                wallet.id === payload.walletId &&
                (!payload.copayerId ||
                  wallet.credentials?.copayerId === payload.copayerId),
            ))
        ) {
          return;
        }
        const selected =
          typeof payload === 'string' ? payload : selectedChainFilterOption;
        loadHistoryRef.current(selected, true);
      },
    );
    return () => subscription.remove();
  }, [key.id, keyFullWalletObjs, selectedChainFilterOption]);

  const listFooterComponentTxsTab = useCallback(() => {
    return (
      <>
        {isLoading || isLoading === undefined ? (
          <SkeletonContainer>
            <WalletTransactionSkeletonRow />
          </SkeletonContainer>
        ) : null}
      </>
    );
  }, [isLoading]);

  const listFooterComponentAssetsTab = () => (
    <>
      <AddCustomTokenContainer
        testID="add-custom-token-button"
        accessibilityLabel="Add custom token"
        onPress={() => {
          haptic('soft');
          if (memorizedAssetsByChainList?.[0].chains?.[0]) {
            navigation.navigate('AddCustomToken', {
              key,
              selectedAccountAddress: accountItem?.receiveAddress,
              selectedChain: memorizedAssetsByChainList[0].chains[0],
            });
          }
        }}>
        <BaseText>{t("Don't see your token?")}</BaseText>
        <Link>{t('Add Custom Token')}</Link>
      </AddCustomTokenContainer>

      {showArchaxBanner && <ArchaxFooter />}
    </>
  );

  useLayoutEffect(() => {
    if (!key) {
      return;
    }

    navigation.setOptions({
      headerTitle: () => {
        return (
          <AccountToogle
            activeOpacity={ActiveOpacity}
            disabled={!hasMultipleAccounts && !linkedCoinbase}
            onPress={() => setShowAccountDropdown(true)}>
            <View>
              <Row style={{alignItems: 'center'}}>
                <KeySvg width={10} height={10} />
                <CenteredText>{key?.keyName}</CenteredText>
              </Row>
              <Row style={{alignItems: 'center'}}>
                {checkPrivateKeyEncrypted(key) ? (
                  <View style={{marginRight: 5}}>
                    {theme.dark ? (
                      <EncryptPasswordDarkModeImg />
                    ) : (
                      <EncryptPasswordImg />
                    )}
                  </View>
                ) : null}
                <HeaderTitle>{accountItem?.accountName}</HeaderTitle>
                {(hasMultipleAccounts || linkedCoinbase) && (
                  <ChevronContainer>
                    {!theme.dark ? (
                      <ChevronDownSvgLight width={8} height={8} />
                    ) : (
                      <ChevronDownSvgDark width={8} height={8} />
                    )}
                  </ChevronContainer>
                )}
              </Row>
            </View>
          </AccountToogle>
        );
      },
      headerRight: () => {
        return (
          <>
            <HeaderRightContainer
              style={{
                marginTop: -3,
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              {pendingProposalsCount ? (
                <ProposalBadgeContainer
                  touchableLibrary={'react-native-gesture-handler'}
                  style={{marginRight: 10}}
                  onPress={onPressTxpBadge}>
                  <ProposalBadge>{pendingProposalsCount}</ProposalBadge>
                </ProposalBadgeContainer>
              ) : null}
              {hasAllChains ? (
                <TouchableOpacity
                  touchableLibrary={'react-native-gesture-handler'}
                  onPress={() =>
                    navigation.navigate('AccountSettings', {
                      keyId: key.id,
                      selectedAccountAddress: accountItem?.receiveAddress,
                      context: 'accountDetails',
                      isSvmAccount,
                    })
                  }>
                  <Icons.AccountSettings />
                </TouchableOpacity>
              ) : (
                <>
                  <Settings
                    onPress={() => {
                      setShowKeyOptions(true);
                    }}
                  />
                </>
              )}
            </HeaderRightContainer>
          </>
        );
      },
    });
  }, [navigation, key, accountItem, theme.dark]);

  const getTxDescriptionDetails = (key: string | undefined) =>
    key === 'moonpay' ? 'MoonPay' : undefined;

  const goToTransactionDetails = (transaction: any) => {
    const fullWalletObj = findWalletById(
      keyFullWalletObjs,
      transaction.walletId,
    ) as Wallet;
    navigation.navigate('TransactionDetails', {
      keyId: key.id,
      walletId: fullWalletObj.id,
      copayerId: fullWalletObj.credentials?.copayerId,
      historyContext: 'account',
      transaction,
    });
  };

  const onPressTransaction = useMemo(
    () => (transaction: any) => {
      const {hasUnconfirmedInputs, action, isRBF, coin, chain} = transaction;
      const isReceived = IsReceived(action);
      const isMoved = IsMoved(action);
      const currency = coin.toLowerCase();

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

  const speedupTransaction = async (transaction: any) => {
    try {
      let tx: any;
      const {currencyAbbreviation, chain} = transaction;
      const fullWalletObj = findWalletById(
        keyFullWalletObjs,
        transaction.walletId,
      ) as Wallet;
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
      const fullWalletObj = findWalletById(
        keyFullWalletObjs,
        tx.walletId,
      ) as Wallet;
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

  const renderTransaction = useCallback(
    ({item}: {item: any}) => {
      return (
        <TransactionRow
          key={item.txid}
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
            billPayIconByMerchantId[item.uiIconURI] ||
            giftCardIcons[item.uiIconURI]
          }
          description={item.uiDescription}
          details={getTxDescriptionDetails(item.customData?.service)}
          time={item.uiTime}
          value={item.uiValue}
          chain={item.chain}
          onPressTransaction={() => onPressTransaction(item)}
        />
      );
    },
    [billPayIconByMerchantId, giftCardIcons, onPressTransaction],
  );

  const renderSectionHeader = useCallback(
    ({section: {title, time}}: {section: {title: string; time?: string}}) => {
      if (!time) {
        return <></>;
      }
      return (
        <TransactionSectionHeaderContainer key={time}>
          <H5>{title}</H5>
        </TransactionSectionHeaderContainer>
      );
    },
    [],
  );

  const onPressItem = useCallback(
    (walletId: string) => {
      haptic('impactLight');
      const fullWalletObj = findWalletById(
        keyFullWalletObjs,
        walletId,
      ) as Wallet;
      if (!fullWalletObj.isComplete() && fullWalletObj?.pendingTssSession) {
        fullWalletObj.getStatus(
          {network: fullWalletObj.network},
          (err, status) => {
            if (err) {
              const errStr =
                err instanceof Error ? err.message : JSON.stringify(err);
              logManager.error(`[getStatus] Error: ${errStr}`);
            } else {
              if (status?.wallet?.status === 'complete') {
                fullWalletObj.openWallet({}, () => {
                  navigation.navigate('WalletDetails', {
                    walletId,
                  });
                });
                return;
              }
              if (!status?.wallet) {
                return;
              }
              navigation.navigate('Copayers', {
                wallet: fullWalletObj,
                status: status.wallet,
              });
            }
          },
        );
      } else {
        navigation.navigate('WalletDetails', {
          walletId,
        });
      }
    },
    [keyFullWalletObjs, navigation],
  );

  const memoizedRenderAssetsItem = useCallback(
    ({item}: {item: WalletRowProps}) => {
      return (
        <WalletRow
          id={item.id}
          hideBalance={hideAllBalances}
          onPress={() => onPressItem(item.id)}
          wallet={item}
        />
      );
    },
    [hideAllBalances, onPressItem],
  );

  const onPressTxpBadge = useMemo(
    () => () => {
      navigation.navigate('TransactionProposalNotifications', {keyId: key.id});
    },
    [],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await sleep(1000);
    try {
      await dispatch(startGetRates({}));
      const walletStatusRefresh = dispatch(
        startUpdateAllWalletStatusForKey({
          key,
          accountAddress: accountItem?.receiveAddress,
          force: true,
          createTokenWalletWithFunds: true,
        }),
      ) as any;

      if (activeTab === 'activity') {
        await Promise.all([
          debouncedLoadHistory(selectedChainFilterOption, true) as any,
          walletStatusRefresh,
        ]);
      } else {
        await walletStatusRefresh;
      }
      if (key.isReadOnly) {
        dispatch(updatePortfolioBalance());
      }
      Promise.resolve()
        .then(() =>
          dispatch(
            maybePopulatePortfolioForWallets({
              walletIds: accountWalletIds,
              quoteCurrency: displayQuoteCurrency,
              forceRetryQuarantined: true,
            }) as any,
          ),
        )
        .catch(error => {
          logManager.warn(
            `[portfolio] Failed background account details refresh populate: ${formatUnknownError(
              error,
            )}`,
          );
        });
    } catch {
      dispatch(showBottomNotificationModal(BalanceUpdateError()));
    }
    setRefreshing(false);
  };

  const ghostTownEmptyState = useMemo(() => {
    return (
      <EmptyListContainer>
        <H5>{t("It's a ghost town in here")}</H5>
        <GhostSvg style={{marginTop: 20}} />
      </EmptyListContainer>
    );
  }, [t]);

  const filteredAccountWallets = useMemo(() => {
    const accountWallets = (accountItem?.wallets || []) as WalletRowProps[];
    return selectedChainFilterOption
      ? accountWallets.filter(
          wallet => wallet.chain === selectedChainFilterOption,
        )
      : accountWallets;
  }, [accountItem?.wallets, selectedChainFilterOption]);

  const accountAllocationData = useMemo(() => {
    if (activeTab !== 'allocation') {
      return {
        totalFiat: 0,
        legendItems: [],
        slices: [],
        rows: [],
      };
    }

    return buildAllocationDataFromWalletRows(
      filteredAccountWallets,
      defaultAltCurrency.isoCode,
    );
  }, [activeTab, defaultAltCurrency.isoCode, filteredAccountWallets]);

  const itemSeparatorComponent = useCallback(() => <BorderBottom />, []);

  const listEmptyComponent = useCallback(() => {
    return (
      <>
        {!isLoading &&
          isLoading !== undefined &&
          !errorLoadingTxs &&
          !groupedHistory?.length &&
          ghostTownEmptyState}

        {!isLoading && isLoading !== undefined && errorLoadingTxs && (
          <EmptyListContainer>
            <H5>{t('Could not update transaction history')}</H5>
            <GhostSvg style={{marginTop: 20}} />
          </EmptyListContainer>
        )}
      </>
    );
  }, [isLoading, errorLoadingTxs, groupedHistory, ghostTownEmptyState]);

  const memorizedAssetsByChainList = useMemo(() => {
    if (!contentReady) {
      return [];
    }

    return buildAssetsByChainList(accountItem, defaultAltCurrency.isoCode);
  }, [accountItem, contentReady, defaultAltCurrency.isoCode]);

  const onToggleAssetChain = useCallback(
    (chain: string, expanded: boolean) => {
      const selectedLocalAssetsDropdown = (reduxStore.getState() as RootState)
        .APP.selectedLocalAssetsDropdown;
      dispatch(
        setLocalAssetsDropdown({
          ...selectedLocalAssetsDropdown,
          [selectedAccountAddress]: {
            ...selectedAccountAssetsDropdown,
            [chain]: expanded,
          },
        }),
      );
    },
    [
      dispatch,
      reduxStore,
      selectedAccountAddress,
      selectedAccountAssetsDropdown,
    ],
  );

  const renderAssetsSectionHeader = useCallback(
    ({section}: {section: VirtualizedAssetsByChainSection}) => (
      <AssetsByChainHeader
        accountItem={section.accountItem}
        expanded={section.expanded}
        hideBalance={hideAllBalances}
        onToggle={onToggleAssetChain}
        showNetworkHeader={memorizedAssetsByChainList.length > 1}
      />
    ),
    [hideAllBalances, memorizedAssetsByChainList.length, onToggleAssetChain],
  );

  const allocationHasAnyBalance = useMemo(
    () =>
      filteredAccountWallets.some(wallet => {
        const sat = Number((wallet as any)?.balance?.sat) || 0;
        const fiat = Number((wallet as any)?.fiatBalance) || 0;
        return sat > 0 || fiat > 0;
      }),
    [filteredAccountWallets],
  );

  const isAllocationLoading =
    activeTab === 'allocation' &&
    (refreshing ||
      (allocationHasAnyBalance && !accountAllocationData.rows?.length));

  const lockedBalanceCurrencyAbbreviation =
    accountItem?.wallets?.[1]?.currencyAbbreviation ??
    accountItem?.wallets?.[0]?.currencyAbbreviation;

  const listHeaderComponent = useMemo(() => {
    const isWalletsTab = activeTab === 'wallets';
    const isAllocationTab = activeTab === 'allocation';
    const isActivityTab = activeTab === 'activity';

    return (
      <>
        <HeaderContainer>
          <BalanceContainer>
            <TouchableOpacity
              onLongPress={() => {
                dispatch(toggleHideAllBalances());
              }}>
              <Row>
                {!hideAllBalances ? (
                  <Balance scale={shouldScale(totalBalance)}>
                    {totalBalance}
                  </Balance>
                ) : (
                  <H2>****</H2>
                )}
              </Row>
            </TouchableOpacity>

            {!hideAllBalances &&
            (showPortfolioValue !== true ||
              shouldRenderAccountBalanceChart ||
              shouldShowAccountChartPlaceholder) ? (
              <FullWidthBalanceChartContainer>
                <BalanceHeaderSupplement
                  changeRowData={accountHeaderChangeRowData}
                  content={accountChartPreContent}
                  reserveChangeRowSpace={
                    shouldRenderAccountBalanceChart ||
                    shouldShowAccountChartPlaceholder
                  }
                />
                {shouldShowAccountChartPlaceholder ? (
                  <BalanceChartLoadingPlaceholder />
                ) : null}
                {shouldRenderAccountBalanceChart ? (
                  <View
                    style={
                      shouldShowAccountChartPlaceholder
                        ? styles.hiddenChart
                        : undefined
                    }>
                    <BalanceHistoryChart
                      wallets={chartableAccountWallets}
                      quoteCurrency={displayQuoteCurrency}
                      rates={rates}
                      timeframeSelectorWidth={timeframeSelectorWidth}
                      showLoaderWhenNoSnapshots={shouldShowAccountChartLoader}
                      renderZeroBalanceWhenNoSnapshots={
                        shouldRenderZeroAccountBalanceChart
                      }
                      isBalanceChartDataReadyToQuery={
                        isAccountBalanceChartDataReadyToQuery
                      }
                      preserveVisibleSeriesWhileNotReady={
                        shouldPreserveStaleAccountBalanceChart ||
                        hasCachedAccountChart
                      }
                      showChangeRow={false}
                      onSelectedBalanceChange={
                        balanceChartSurface.chartCallbacks
                          .onSelectedBalanceChange
                      }
                      onDisplayedAnalysisPointChange={
                        balanceChartSurface.chartCallbacks
                          .onDisplayedAnalysisPointChange
                      }
                      onChangeRowData={
                        balanceChartSurface.chartCallbacks.onChangeRowData
                      }
                      onRenderableSeriesChange={
                        onAccountChartRenderableSeriesChange
                      }
                    />
                  </View>
                ) : null}
              </FullWidthBalanceChartContainer>
            ) : null}
          </BalanceContainer>
          <LinkingButtons
            buy={{
              cta: () => {
                dispatch(
                  Analytics.track('Clicked Buy Crypto', {
                    context: 'AccountDetails',
                  }),
                );
                navigation.navigate(ExternalServicesScreens.ROOT_BUY_AND_SELL, {
                  context: 'buyCrypto',
                  fromAccount: {
                    keyId,
                    accountAddress: selectedAccountAddress,
                  },
                });
              },
            }}
            sell={{
              cta: () => {
                dispatch(
                  Analytics.track('Clicked Sell Crypto', {
                    context: 'AccountDetails',
                  }),
                );
                navigation.navigate(ExternalServicesScreens.ROOT_BUY_AND_SELL, {
                  context: 'sellCrypto',
                });
              },
            }}
            swap={{
              cta: () => {
                dispatch(
                  Analytics.track('Clicked Swap Crypto', {
                    context: 'AccountDetails',
                  }),
                );
                navigation.navigate('SwapCryptoRoot', {
                  selectedAccount: selectedAccountAddress,
                });
              },
            }}
            receive={{
              cta: () => {
                dispatch(
                  Analytics.track('Clicked Receive', {
                    context: 'AccountDetails',
                  }),
                );
                setShowReceiveAddressBottomModal(true);
              },
            }}
            send={{
              cta: () => {
                navigation.navigate('GlobalSelect', {
                  context: 'send',
                  selectedAccountAddress: accountItem?.receiveAddress,
                });
              },
            }}
          />
          {Number(accountItem?.fiatLockedBalanceFormat) > 0 ? (
            <LockedBalanceContainer onPress={() => {}}>
              <View>
                <Description numberOfLines={1} ellipsizeMode={'tail'}>
                  {t('Total Locked Balance')}
                </Description>
              </View>

              <TailContainer>
                <Value>
                  {accountItem?.fiatLockedBalanceFormat}
                  {lockedBalanceCurrencyAbbreviation
                    ? ` ${formatCurrencyAbbreviation(
                        lockedBalanceCurrencyAbbreviation,
                      )}`
                    : ''}
                </Value>
              </TailContainer>
            </LockedBalanceContainer>
          ) : null}
        </HeaderContainer>
        <AssetsDataContainer>
          <HeaderListContainer>
            <WalletListHeader
              activeOpacity={1}
              onPress={() => {
                setActiveTab('wallets');
              }}>
              <WalletListHeaderLabel isActive={isWalletsTab}>
                <H5>{t('Wallets')}</H5>
              </WalletListHeaderLabel>
            </WalletListHeader>
            {showPortfolioValue ? (
              <WalletListHeader
                activeOpacity={1}
                onPress={() => {
                  setActiveTab('allocation');
                }}>
                <WalletListHeaderLabel isActive={isAllocationTab}>
                  <H5>{t('Allocation')}</H5>
                </WalletListHeaderLabel>
              </WalletListHeader>
            ) : null}
            <WalletListHeader
              activeOpacity={1}
              onPress={async () => {
                setActiveTab('activity');
                await sleep(200);
                debouncedLoadHistory(selectedChainFilterOption);
              }}>
              <WalletListHeaderLabel isActive={isActivityTab}>
                <H5>{t('Activity')}</H5>
              </WalletListHeaderLabel>
            </WalletListHeader>
          </HeaderListContainer>
          {isSvmAccount || (isSmallScreen && showPortfolioValue) ? null : (
            <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
              {isAllocationTab ? (
                <SearchComponent<Partial<AssetsByChainListProps>>
                  searchVal={searchVal}
                  setSearchVal={setSearchVal}
                  searchResults={searchResultsAssets}
                  setSearchResults={setSearchResultsAssets}
                  searchFullList={memorizedAssetsByChainList}
                  context={'accountassetsview'}
                />
              ) : (
                <SearchComponent<
                  GroupedHistoryProps | Partial<AssetsByChainListProps>
                >
                  searchVal={searchVal}
                  setSearchVal={setSearchVal}
                  searchResults={
                    isWalletsTab ? searchResultsAssets : searchResultsHistory
                  }
                  //@ts-ignore
                  setSearchResults={
                    isWalletsTab
                      ? setSearchResultsAssets
                      : setSearchResultsHistory
                  }
                  searchFullList={
                    isWalletsTab ? memorizedAssetsByChainList : groupedHistory
                  }
                  context={
                    isWalletsTab ? 'accountassetsview' : 'accounthistoryview'
                  }
                />
              )}
            </View>
          )}
        </AssetsDataContainer>
      </>
    );
  }, [
    activeTab,
    accountChartPreContent,
    accountHeaderChangeRowData,
    accountItem?.fiatLockedBalanceFormat,
    accountItem?.receiveAddress,
    chartableAccountWallets,
    debouncedLoadHistory,
    displayQuoteCurrency,
    defaultAltCurrency.isoCode,
    dispatch,
    groupedHistory,
    hasCachedAccountChart,
    hideAllBalances,
    isAccountBalanceChartDataReadyToQuery,
    isSmallScreen,
    isSvmAccount,
    balanceChartSurface,
    keyFullWalletObjs,
    lockedBalanceCurrencyAbbreviation,
    memorizedAssetsByChainList,
    navigation,
    onAccountChartRenderableSeriesChange,
    rates,
    searchResultsAssets,
    searchResultsHistory,
    searchVal,
    selectedChainFilterOption,
    shouldRenderAccountBalanceChart,
    shouldShowAccountChartPlaceholder,
    shouldPreserveStaleAccountBalanceChart,
    shouldRenderZeroAccountBalanceChart,
    shouldShowAccountChartLoader,
    showPortfolioValue,
    t,
    timeframeSelectorWidth,
    totalBalance,
  ]);

  const listFooterComponentAllocationTab = useCallback(() => {
    if (activeTab !== 'allocation') {
      return null;
    }

    if (isAllocationLoading) {
      return (
        <AllocationDonutLegendCard
          legendItems={[]}
          slices={[]}
          style={{marginLeft: 16, marginRight: 16}}
          isLoading
        />
      );
    }

    if (!accountAllocationData.rows?.length) {
      return ghostTownEmptyState;
    }

    return (
      <View>
        <AllocationDonutLegendCard
          legendItems={accountAllocationData.legendItems}
          slices={accountAllocationData.slices}
          style={{marginLeft: 16, marginRight: 16}}
        />
        <AllocationRowsList rows={accountAllocationData.rows} />
      </View>
    );
  }, [
    activeTab,
    accountAllocationData.legendItems,
    accountAllocationData.rows,
    accountAllocationData.slices,
    ghostTownEmptyState,
    isAllocationLoading,
  ]);

  const renderDataSectionComponent = useMemo(() => {
    if (!contentReady) {
      return [];
    }

    const isAllocationTab = activeTab === 'allocation';
    const isActivityTab = activeTab === 'activity';

    if (isAllocationTab) {
      return [];
    }

    const filteredSections =
      !searchVal && !selectedChainFilterOption
        ? isActivityTab
          ? groupedHistory
          : memorizedAssetsByChainList
        : isActivityTab
        ? searchResultsHistory
        : searchResultsAssets;

    if (isActivityTab) {
      return filteredSections;
    }

    return buildVirtualizedAssetsByChainSections(
      filteredSections as Partial<AssetsByChainListProps>[],
      selectedAccountAssetsDropdown,
      memorizedAssetsByChainList.length === 1,
    );
  }, [
    searchVal,
    selectedChainFilterOption,
    activeTab,
    searchResultsAssets,
    searchResultsHistory,
    groupedHistory,
    memorizedAssetsByChainList,
    selectedAccountAssetsDropdown,
    contentReady,
  ]);

  const hasWalletSectionHeaders =
    activeTab === 'wallets' && renderDataSectionComponent.length > 0;
  const listEmptyComponentForTab =
    activeTab === 'allocation' || hasWalletSectionHeaders
      ? null
      : listEmptyComponent;

  const sectionListKeyExtractor = useCallback(
    (item: any, _index: number) =>
      activeTab === 'activity' ? `${item.txid}+${item.walletId}` : item.id,
    [activeTab],
  );

  return (
    <SafeAreaView style={styles.accountDetailsContainer}>
      <SectionList
        extraData={activeTab}
        refreshControl={
          <RefreshControl
            tintColor={theme.dark ? White : SlateDark}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListHeaderComponent={listHeaderComponent}
        ListFooterComponent={
          activeTab === 'wallets'
            ? listFooterComponentAssetsTab
            : activeTab === 'activity'
            ? listFooterComponentTxsTab
            : listFooterComponentAllocationTab
        }
        keyExtractor={sectionListKeyExtractor}
        //@ts-ignore
        sections={renderDataSectionComponent}
        renderSectionHeader={
          activeTab === 'wallets'
            ? (renderAssetsSectionHeader as any)
            : activeTab === 'activity'
            ? renderSectionHeader
            : undefined
        }
        stickySectionHeadersEnabled={activeTab === 'activity'}
        renderItem={
          activeTab === 'wallets'
            ? memoizedRenderAssetsItem
            : activeTab === 'activity'
            ? renderTransaction
            : () => null
        }
        {...(activeTab === 'activity' && {
          stickyHeaderIndices: [groupedHistory?.length],
          ItemSeparatorComponent: itemSeparatorComponent,
          onMomentumScrollBegin: () => setIsScrolling(true),
          onMomentumScrollEnd: () => setIsScrolling(false),
          onEndReached: () => {
            if (isScrolling) {
              debouncedLoadHistory(selectedChainFilterOption);
            }
          },
          onEndReachedThreshold: 0.3,
          maxToRenderPerBatch: 15,
        })}
        ListEmptyComponent={listEmptyComponentForTab}
        getItemLayout={
          activeTab === 'activity' ? transactionItemLayout : undefined
        }
      />

      <SheetModal
        isVisible={showAccountDropdown}
        placement={'top'}
        onBackdropPress={() => setShowAccountDropdown(false)}>
        <AccountDropdown>
          <HeaderTitle style={{margin: 15}}>{t('Other Accounts')}</HeaderTitle>
          <AccountDropdownOptionsContainer>
            {accountDropdownList.map(_accountItem => (
              <DropdownOption
                key={_accountItem?.id}
                optionId={_accountItem?.id}
                optionName={_accountItem?.accountName}
                wallets={_accountItem?.wallets}
                totalBalance={_accountItem?.fiatBalance}
                onPress={(accountId: string) => {
                  setShowAccountDropdown(false);
                  const selectedAccountItem = accountDropdownList.find(
                    account => account.id === accountId,
                  );
                  navigation.setParams({
                    keyId: selectedAccountItem?.keyId,
                    selectedAccountAddress: selectedAccountItem?.receiveAddress,
                  });
                }}
                defaultAltCurrencyIsoCode={defaultAltCurrency.isoCode}
                hideKeyBalance={hideAllBalances}
              />
            ))}
            {linkedCoinbase ? (
              <CoinbaseDropdownOption
                onPress={() => {
                  setShowAccountDropdown(false);
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 1,
                      routes: [
                        {
                          name: RootStacks.TABS,
                          params: {screen: TabsScreens.HOME},
                        },
                        {
                          name: CoinbaseScreens.ROOT,
                          params: {},
                        },
                      ],
                    }),
                  );
                }}
              />
            ) : null}
          </AccountDropdownOptionsContainer>
        </AccountDropdown>
      </SheetModal>

      {keyOptions.length > 0 ? (
        <OptionsSheet
          isVisible={showKeyOptions}
          title={t('Account Options')}
          options={keyOptions}
          closeModal={() => setShowKeyOptions(false)}
        />
      ) : null}

      {keyFullWalletObjs[0] ? (
        <ReceiveAddress
          isVisible={showReceiveAddressBottomModal}
          closeModal={() => setShowReceiveAddressBottomModal(false)}
          wallet={keyFullWalletObjs[0]}
          context={'accountdetails'}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default AccountDetails;
