import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  CommonActions,
  RouteProp,
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
  useTheme,
} from '@react-navigation/native';
import {FlashList} from '@shopify/flash-list';
import {useStore} from 'react-redux';
import {
  LayoutChangeEvent,
  LogBox,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {TouchableOpacity} from 'react-native-gesture-handler';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  Balance,
  BaseText,
  H2,
  H5,
  HeaderTitle,
  Link,
  ProposalBadge,
} from '../../../components/styled/Text';
import Settings from '../../../components/settings/Settings';
import {
  ActiveOpacity,
  ScreenGutter,
  HeaderRightContainer as _HeaderRightContainer,
  ProposalBadgeContainer,
  EmptyListContainer,
  ChevronContainer,
} from '../../../components/styled/Containers';
import {
  showBottomNotificationModal,
  toggleHideAllBalances,
} from '../../../store/app/app.actions';
import {selectShowPortfolioValue} from '../../../store/app/app.selectors';
import {maybePopulatePortfolioForWallets} from '../../../store/portfolio';
import {startUpdateAllWalletStatusForKey} from '../../../store/wallet/effects/status/status';
import {
  successAddWallet,
  updatePortfolioBalance,
  syncWallets,
} from '../../../store/wallet/wallet.actions';
import {Key, KeyMethods, Wallet} from '../../../store/wallet/wallet.models';
import {
  CharcoalBlack,
  GhostWhite,
  LightBlack,
  NeutralSlate,
  Slate30,
  SlateDark,
  White,
} from '../../../styles/colors';
import {
  createWalletsForAccounts,
  formatFiatAmount,
  shouldScale,
  sleep,
  fixWalletAddresses,
  getEvmGasWallets,
} from '../../../utils/helper-methods';
import {
  BalanceUpdateError,
  CustomErrorMessage,
} from '../components/ErrorMessages';
import OptionsSheet, {Option} from '../components/OptionsSheet';
import Icons from '../components/WalletIcons';
import {WalletGroupParamList} from '../WalletGroup';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {
  getActiveWalletStoreInitPromise,
  getDecryptPassword,
  normalizeMnemonic,
  serverAssistedImport,
  startGetRates,
} from '../../../store/wallet/effects';
import EncryptPasswordImg from '../../../../assets/img/tinyicon-encrypt.svg';
import EncryptPasswordDarkModeImg from '../../../../assets/img/tinyicon-encrypt-darkmode.svg';
import {useTranslation} from 'react-i18next';
import {
  buildAccountList,
  mapAbbreviationAndName,
  buildWalletObj,
  checkPrivateKeyEncrypted,
} from '../../../store/wallet/utils/wallet';
import {
  buildAccountListSignature,
  getRatesRevision,
  readAccountListSnapshot,
  resolveAccountListSnapshot,
} from '../../../store/wallet/utils/accountListCache';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import CoinbaseDropdownOption from '../components/CoinbaseDropdownOption';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../../navigation/tabs/TabsStack';
import {CoinbaseScreens} from '../../../navigation/coinbase/CoinbaseGroup';
import SearchComponent from '../../../components/chain-search/ChainSearch';
import {
  IsEVMChain,
  IsSVMChain,
  IsVMChain,
} from '../../../store/wallet/utils/currency';
import AccountListRow, {
  AccountRowProps,
} from '../../../components/list/AccountListRow';
import PerformanceProfiler from '../../../components/performance/PerformanceProfiler';
import {logReactProfiler} from '../../../utils/reactPerformanceProfiler';
import _ from 'lodash';
import DropdownOption from '../components/DropdownOption';
import GhostSvg from '../../../../assets/img/ghost-straight-face.svg';
import ChevronDownSvgLight from '../../../../assets/img/chevron-down-lightmode.svg';
import ChevronDownSvgDark from '../../../../assets/img/chevron-down-darkmode.svg';
import {
  BitpaySupportedEvmCoins,
  getBaseEVMAccountCreationCoinsAndTokens,
} from '../../../constants/currencies';
import {BitpaySupportedTokenOptsByAddress} from '../../../constants/tokens';
import {BWCErrorMessage} from '../../../constants/BWCError';
import ArchaxFooter from '../../../components/archax/archax-footer';
import {useOngoingProcess, useTokenContext} from '../../../contexts';
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
import {getDifferenceColor} from '../../../components/percentage/Percentage';
import Button from '../../../components/button/Button';
import {AllocationDonutLegendCard} from '../../tabs/home/components/AllocationSection';
import ChevronRightSvg from '../../tabs/home/components/ChevronRightSvg';
import {HomeSectionTitle} from '../../tabs/home/components/Styled';
import {
  buildAllocationDataFromWalletRows,
  type AllocationWallet,
} from '../../../utils/portfolio/allocation';
import {isTSSKey} from '../../../store/wallet/effects/tss-send/tss-send';
import {
  getVisibleWalletsForKey,
  getQuoteCurrency,
  isPopulateLoadingForWallets,
} from '../../../utils/portfolio/assets';
import usePortfolioGainLossSummary from '../../../portfolio/ui/hooks/usePortfolioGainLossSummary';
import {formatUnknownError} from '../../../utils/errors/formatUnknownError';
import {RootState} from '../../../store';
import {PERF_DEBUG, performanceLog} from '../../../utils/performanceDebug';
import {scheduleAfterTransitionAndIdle} from '../../../utils/scheduleAfterInteractionsAndFrames';

const EMPTY_ACCOUNT_LIST: AccountRowProps[] = [];

const AccountListItem = React.memo(
  ({
    item,
    hideBalance,
    animateEntrance,
    onPressItem,
    onPressInItem,
  }: {
    item: AccountRowProps;
    hideBalance: boolean;
    animateEntrance: boolean;
    onPressItem: (item: AccountRowProps) => void;
    onPressInItem: (item: AccountRowProps) => void;
  }) => {
    const onPress = useCallback(() => onPressItem(item), [item, onPressItem]);
    const onPressIn = useCallback(
      () => onPressInItem(item),
      [item, onPressInItem],
    );

    return (
      <AccountListRow
        id={item.id}
        accountItem={item}
        hideBalance={hideBalance}
        animateEntrance={animateEntrance}
        onPress={onPress}
        onPressIn={onPressIn}
      />
    );
  },
);
AccountListItem.displayName = 'AccountListItem';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const gutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  keyToggle: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  keyDropdown: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    maxHeight: '75%',
  },
  keyDropdownOptionsContainer: {
    paddingHorizontal: gutter,
  },
  cogIconContainer: {
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    width: 40,
  },
  overviewContainer: {
    flex: 1,
  },
  balanceContainer: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  walletListHeader: {
    padding: 10,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletListFooterContainer: {
    paddingTop: 10,
    paddingRight: 10,
    paddingBottom: 100,
    paddingLeft: 10,
    marginTop: 15,
    gap: 12,
  },
  addWalletLinkContainer: {
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 15,
  },
  addWalletLink: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '500',
    lineHeight: 24,
  },
  addWalletLinkButton: {
    paddingHorizontal: 20,
  },
  addWalletSpacer: {
    height: 10,
  },
  allocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  allocationHeaderAction: {
    padding: 6,
  },
  allocationFooter: {
    marginTop: 20,
    paddingBottom: 5,
  },
  allocationDivider: {
    height: 1,
    opacity: 1,
    marginVertical: 12,
  },
  allocationLabel: {
    fontSize: 12,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 14,
  },
  allocationValue: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '500',
    lineHeight: 24,
    marginTop: 4,
  },
  hiddenChart: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  allocationColumn: {
    flex: 1,
  },
  allocationMetricValue: {
    fontSize: 14,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 20,
    marginTop: 4,
  },
});

export const KeyToggle: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.keyToggle, style]} {...rest} />
);

export const KeyDropdown: React.FC<
  React.ComponentProps<typeof SafeAreaView>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <SafeAreaView
      style={[
        styles.keyDropdown,
        {backgroundColor: theme.dark ? LightBlack : White},
        style,
      ]}
      {...rest}
    />
  );
};

export const KeyDropdownOptionsContainer: React.FC<
  React.ComponentProps<typeof ScrollView>
> = ({style, ...rest}) => (
  <ScrollView style={[styles.keyDropdownOptionsContainer, style]} {...rest} />
);

const OtherKeyDropdownOptions: React.FC<{
  currentKeyId: string;
  defaultAltCurrencyIsoCode: string;
  hideKeyBalance: boolean;
  onSelectKey: (keyId: string) => void;
}> = ({
  currentKeyId,
  defaultAltCurrencyIsoCode,
  hideKeyBalance,
  onSelectKey,
}) => {
  const keys = useAppSelector(({WALLET}) => WALLET.keys) as Record<string, Key>;

  return (
    <>
      {Object.values(keys)
        .filter(key => key.backupComplete && key.id !== currentKeyId)
        .map(key => (
          <DropdownOption
            key={key.id}
            optionId={key.id}
            optionName={key.keyName}
            wallets={key.wallets}
            totalBalance={key.totalBalance}
            onPress={onSelectKey}
            defaultAltCurrencyIsoCode={defaultAltCurrencyIsoCode}
            hideKeyBalance={hideKeyBalance}
          />
        ))}
    </>
  );
};

export const CogIconContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.cogIconContainer,
        {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
        style,
      ]}
      {...rest}
    />
  );
};

const OverviewContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof SafeAreaView>
>(({style, ...rest}, ref) => (
  <SafeAreaView ref={ref} style={[styles.overviewContainer, style]} {...rest} />
));

const BalanceContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.balanceContainer, style]} {...rest} />;

const WalletListHeader: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.walletListHeader, style]} {...rest} />;

const WalletListFooterContainer: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => (
  <View style={[styles.walletListFooterContainer, style]} {...rest} />
);

const AddWalletLinkContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.addWalletLinkContainer, style]} {...rest} />;

const AddWalletLink: React.FC<React.ComponentProps<typeof Link>> = ({
  style,
  suppressHighlighting = true,
  ...rest
}) => (
  <Link
    suppressHighlighting={suppressHighlighting}
    style={[styles.addWalletLink, style]}
    {...rest}
  />
);

const AddWalletLinkButton: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.addWalletLinkButton, style]} {...rest} />
);

const AddWalletSpacer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.addWalletSpacer, style]} {...rest} />;

const AllocationHeader: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.allocationHeader, style]} {...rest} />;

const AllocationHeaderAction: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.allocationHeaderAction, style]} {...rest} />
);

const AllocationFooter: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.allocationFooter, style]} {...rest} />;

const AllocationDivider: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.allocationDivider,
        {backgroundColor: theme.dark ? SlateDark : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

const AllocationLabel: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.allocationLabel,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const AllocationValue: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.allocationValue, {color: theme.colors.text}, style]}
      {...rest}
    />
  );
};

const AllocationRow: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.allocationRow, style]} {...rest} />;

const AllocationColumn: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.allocationColumn, style]} {...rest} />;

const AllocationMetricValue: React.FC<
  React.ComponentProps<typeof BaseText> & {positive?: boolean}
> = ({positive, style, ...rest}) => {
  const theme = useTheme();
  const color =
    positive === true
      ? getDifferenceColor(true, theme.dark)
      : positive === false
      ? getDifferenceColor(false, theme.dark)
      : theme.dark
      ? White
      : SlateDark;
  return (
    <BaseText
      style={[styles.allocationMetricValue, {color}, style]}
      {...rest}
    />
  );
};

const AllocationMetricSkeleton: React.FC<{
  align?: 'left' | 'right' | 'center';
}> = ({align = 'left'}) => {
  const theme = useTheme();
  return (
    <SkeletonPlaceholder
      backgroundColor={theme.dark ? CharcoalBlack : NeutralSlate}
      highlightColor={theme.dark ? LightBlack : GhostWhite}>
      <SkeletonPlaceholder.Item
        width={120}
        height={12}
        borderRadius={2}
        marginTop={10}
        alignSelf={
          align === 'right'
            ? 'flex-end'
            : align === 'center'
            ? 'center'
            : 'flex-start'
        }
      />
    </SkeletonPlaceholder>
  );
};

const headerRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

const HeaderTitleContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[headerRowStyles.row, style]} {...rest} />;

const HeaderRightContainer: React.FC<
  React.ComponentProps<typeof _HeaderRightContainer>
> = ({style, ...rest}) => (
  <_HeaderRightContainer style={[headerRowStyles.row, style]} {...rest} />
);

const KeyOverviewAllocationGainLossFooter = React.memo(
  ({
    hideAllBalances,
    isPopulateLoading,
    liveFiatTotal,
    wallets,
  }: {
    hideAllBalances: boolean;
    isPopulateLoading: boolean;
    liveFiatTotal: number;
    wallets: Wallet[];
  }) => {
    const {summary: gainLossSummary, loading: isGainLossSummaryLoading} =
      usePortfolioGainLossSummary({
        wallets,
        liveFiatTotal,
      });

    const allTimeGainLossText = useMemo(() => {
      if (!gainLossSummary.total.available) {
        return null;
      }

      if (hideAllBalances) {
        const pctSign = gainLossSummary.total.percentRatio >= 0 ? '+' : '-';
        const pct = Math.abs(gainLossSummary.total.percentRatio * 100).toFixed(
          2,
        );
        return `****  (${pctSign}${pct}%)`;
      }

      const sign = gainLossSummary.total.deltaFiat >= 0 ? '+' : '-';
      const pctSign = gainLossSummary.total.percentRatio >= 0 ? '+' : '-';
      const amt = formatFiatAmount(
        Math.abs(gainLossSummary.total.deltaFiat),
        gainLossSummary.quoteCurrency,
        {
          customPrecision: 'minimal',
          currencyDisplay: 'symbol',
        },
      );
      const pct = Math.abs(gainLossSummary.total.percentRatio * 100).toFixed(2);
      return `${sign}${amt}  (${pctSign}${pct}%)`;
    }, [
      gainLossSummary.quoteCurrency,
      gainLossSummary.total.available,
      gainLossSummary.total.deltaFiat,
      gainLossSummary.total.percentRatio,
      hideAllBalances,
    ]);

    const allTimeIsPositive = gainLossSummary.total.available
      ? gainLossSummary.total.deltaFiat >= 0
      : true;

    const todayGainLossText = useMemo(() => {
      if (!gainLossSummary.today.available) {
        return null;
      }

      if (hideAllBalances) {
        const pctSign = gainLossSummary.today.percentRatio >= 0 ? '+' : '-';
        const pct = Math.abs(gainLossSummary.today.percentRatio * 100).toFixed(
          2,
        );
        return `****  (${pctSign}${pct}%)`;
      }

      const sign = gainLossSummary.today.deltaFiat >= 0 ? '+' : '-';
      const pctSign = gainLossSummary.today.percentRatio >= 0 ? '+' : '-';
      const amt = formatFiatAmount(
        Math.abs(gainLossSummary.today.deltaFiat),
        gainLossSummary.quoteCurrency,
        {
          customPrecision: 'minimal',
          currencyDisplay: 'symbol',
        },
      );
      const pct = Math.abs(gainLossSummary.today.percentRatio * 100).toFixed(2);
      return `${sign}${amt}  (${pctSign}${pct}%)`;
    }, [
      gainLossSummary.quoteCurrency,
      gainLossSummary.today.available,
      gainLossSummary.today.deltaFiat,
      gainLossSummary.today.percentRatio,
      hideAllBalances,
    ]);

    const todayIsPositive = gainLossSummary.today.available
      ? gainLossSummary.today.deltaFiat >= 0
      : true;

    const showAllTimeGainLossSkeleton =
      isPopulateLoading ||
      (isGainLossSummaryLoading && allTimeGainLossText === null);

    const showTodayGainLossSkeleton =
      isPopulateLoading ||
      (isGainLossSummaryLoading && todayGainLossText === null);

    const showAllTimeGainLossColumn =
      allTimeGainLossText !== null || showAllTimeGainLossSkeleton;

    return (
      <>
        <AllocationDivider />

        <AllocationRow>
          {showAllTimeGainLossColumn ? (
            <AllocationColumn style={{paddingRight: 12}}>
              <AllocationLabel>All-Time Gain / Loss ($)</AllocationLabel>
              {showAllTimeGainLossSkeleton ? (
                <AllocationMetricSkeleton />
              ) : allTimeGainLossText !== null ? (
                <AllocationMetricValue positive={allTimeIsPositive}>
                  {allTimeGainLossText}
                </AllocationMetricValue>
              ) : null}
            </AllocationColumn>
          ) : null}
          <AllocationColumn
            style={showAllTimeGainLossColumn ? {paddingLeft: 12} : undefined}>
            <AllocationLabel style={{textAlign: 'right'}}>
              Today's Gain / Loss ($)
            </AllocationLabel>
            {showTodayGainLossSkeleton ? (
              <AllocationMetricSkeleton align="right" />
            ) : todayGainLossText !== null ? (
              <AllocationMetricValue
                positive={todayIsPositive}
                style={{textAlign: 'right'}}>
                {todayGainLossText}
              </AllocationMetricValue>
            ) : null}
          </AllocationColumn>
        </AllocationRow>
      </>
    );
  },
);

const KeyOverview = () => {
  const {t} = useTranslation();
  const route = useRoute<RouteProp<WalletGroupParamList, 'KeyOverview'>>();
  const {id, context, _preloadContent = false} = route.params;
  const wasPreloadedRef = useRef(_preloadContent);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const dispatch = useAppDispatch();
  const reduxStore = useStore();
  const logger = useLogger();
  const theme = useTheme();
  const {width: windowWidth} = useWindowDimensions();
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const {tokenOptionsByAddress} = useTokenContext();
  const [showKeyOptions, setShowKeyOptions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [contentReady, setContentReady] = useState(_preloadContent);
  const [renderedKeyChartIdentity, setRenderedKeyChartIdentity] =
    useState<string>();
  const key = useAppSelector(({WALLET}: RootState) => WALLET.keys[id]) as Key;
  const hasMultipleKeys = useAppSelector(({WALLET}) => {
    let completedKeyCount = 0;

    for (const candidateKey of Object.values(
      WALLET.keys as Record<string, Key>,
    )) {
      if (candidateKey.backupComplete) {
        completedKeyCount += 1;
        if (completedKeyCount > 1) {
          return true;
        }
      }
    }

    return false;
  });
  const rates = useAppSelector(({RATE}) => RATE.rates);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const showPortfolioValue = useAppSelector(selectShowPortfolioValue);
  const portfolioQuoteCurrency = useAppSelector(
    ({PORTFOLIO}) => PORTFOLIO.quoteCurrency,
  );
  const linkedCoinbase = useAppSelector(
    ({COINBASE}) => !!COINBASE.token[COINBASE_ENV],
  );
  const timeframeSelectorWidth = getTimeframeSelectorWidth(
    windowWidth,
    ScreenGutter,
  );

  const [showKeyDropdown, setShowKeyDropdown] = useState(false);
  const viewedKeyId = key?.id;
  const [shouldLoadAllocationGainLoss, setShouldLoadAllocationGainLoss] =
    useState(false);
  const allocationFooterViewRef = useRef<View | null>(null);
  const overviewContainerRef = useRef<View | null>(null);
  const allocationFooterVisibilityCheckInFlightRef = useRef(false);

  useEffect(() => {
    setShouldLoadAllocationGainLoss(false);
    allocationFooterVisibilityCheckInFlightRef.current = false;
  }, [id]);

  useEffect(() => {
    const unsubscribe = (navigation as any).addListener(
      'transitionEnd',
      (event: {data: {closing: boolean}}) => {
        if (event.data.closing) {
          return;
        }

        setContentReady(true);
      },
    );

    return unsubscribe;
  }, [navigation]);

  const [searchVal, setSearchVal] = useState('');
  const activeViewUpdateRef = useRef<{
    keyId: string;
    promise: Promise<void>;
  } | null>(null);
  const [searchResults, setSearchResults] = useState([] as AccountRowProps[]);
  const selectedChainFilterOption = useAppSelector(
    ({APP}) => APP.selectedChainFilterOption,
  );
  const quoteCurrency = getQuoteCurrency({
    portfolioQuoteCurrency,
    defaultAltCurrencyIsoCode: defaultAltCurrency?.isoCode,
  });

  const accountListCacheKey = `keyOverviewAccountList:${id}`;
  const hydratedFromSnapshotRef = useRef<boolean | undefined>(undefined);

  const memoizedAccountList = useMemo(() => {
    if (hydratedFromSnapshotRef.current === undefined) {
      hydratedFromSnapshotRef.current =
        readAccountListSnapshot<AccountRowProps[]>(accountListCacheKey) !==
        undefined;
    }

    // Same rule as the balance chart: a cached list paints right away instead
    // of waiting for the opening transition to finish.
    if (!contentReady) {
      return (
        readAccountListSnapshot<AccountRowProps[]>(accountListCacheKey) ??
        EMPTY_ACCOUNT_LIST
      );
    }

    const startedAt = PERF_DEBUG ? performance.now() : 0;
    let didBuild = false;
    const accountList = resolveAccountListSnapshot({
      cacheKey: accountListCacheKey,
      signature: buildAccountListSignature({
        wallets: key?.wallets,
        quoteCurrency: defaultAltCurrency.isoCode,
        ratesRevision: getRatesRevision(rates),
      }),
      build: () => {
        didBuild = true;
        return buildAccountList(
          key,
          defaultAltCurrency.isoCode,
          rates,
          dispatch,
          {
            filterByHideWallet: true,
          },
        );
      },
    });

    if (PERF_DEBUG) {
      performanceLog(
        `[PERF-KEY-OVERVIEW] accountList source:${
          didBuild ? 'build' : 'cache'
        } rows:${accountList.length} durationMs:${
          Math.round((performance.now() - startedAt) * 10) / 10
        } preloaded:${wasPreloadedRef.current}`,
      );
    }

    return accountList;
  }, [
    accountListCacheKey,
    contentReady,
    dispatch,
    key,
    defaultAltCurrency.isoCode,
    rates,
  ]);

  const pendingTxpCount =
    key?.wallets.reduce(
      (count, wallet) => count + (wallet.pendingTxps?.length || 0),
      0,
    ) || 0;

  const missingChainsAccountsCount = useMemo(() => {
    const supportedEvmChainCount = Object.keys(BitpaySupportedEvmCoins).length;

    return memoizedAccountList.reduce((count, {chains}) => {
      return (
        count +
        (IsEVMChain(chains[0]) && chains.length !== supportedEvmChainCount
          ? 1
          : 0)
      );
    }, 0);
  }, [memoizedAccountList]);

  const hasMissingEvmNetworks = missingChainsAccountsCount > 0;

  const onPressTxpBadge = useCallback(() => {
    if (!key?.id) {
      return;
    }

    navigation.navigate('TransactionProposalNotifications', {keyId: key.id});
  }, [key?.id, navigation]);

  useLayoutEffect(() => {
    // React Navigation gives preloaded routes a placeholder navigation object.
    // Its setOptions intentionally throws until the route becomes focused.
    if (!key || !isFocused) {
      return;
    }

    navigation.setOptions({
      headerTitle: () => {
        return (
          <KeyToggle
            activeOpacity={ActiveOpacity}
            disabled={!hasMultipleKeys && !linkedCoinbase}
            onPress={() => setShowKeyDropdown(true)}>
            {checkPrivateKeyEncrypted(key) ? (
              theme.dark ? (
                <EncryptPasswordDarkModeImg />
              ) : (
                <EncryptPasswordImg />
              )
            ) : null}
            <HeaderTitleContainer>
              <HeaderTitle style={{textAlign: 'center'}}>
                {key?.keyName}
              </HeaderTitle>
            </HeaderTitleContainer>
            {(hasMultipleKeys || linkedCoinbase) && (
              <ChevronContainer>
                {!theme.dark ? (
                  <ChevronDownSvgLight width={8} height={8} />
                ) : (
                  <ChevronDownSvgDark width={8} height={8} />
                )}
              </ChevronContainer>
            )}
          </KeyToggle>
        );
      },
      headerRight: () => {
        return (
          <>
            <HeaderRightContainer>
              {pendingTxpCount ? (
                <ProposalBadgeContainer
                  touchableLibrary={'react-native-gesture-handler'}
                  style={{marginRight: 10}}
                  onPress={onPressTxpBadge}>
                  <ProposalBadge>{pendingTxpCount}</ProposalBadge>
                </ProposalBadgeContainer>
              ) : null}
              {checkPrivateKeyEncrypted(key) && !hasMissingEvmNetworks ? (
                <CogIconContainer
                  onPress={() => {
                    navigation.navigate('KeySettings', {
                      keyId: key.id,
                    });
                  }}
                  activeOpacity={ActiveOpacity}>
                  <Icons.Cog />
                </CogIconContainer>
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
  }, [
    navigation,
    key,
    hasMultipleKeys,
    linkedCoinbase,
    hasMissingEvmNetworks,
    isFocused,
    onPressTxpBadge,
    pendingTxpCount,
    theme.dark,
  ]);

  const firstWallet = key?.wallets?.[0];

  useEffect(() => {
    if (context !== 'createNewMultisigKey' || !firstWallet) {
      return;
    }

    firstWallet.getStatus({}, (err, status) => {
      if (err) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        logger.error(
          `error [KeyOverview - createNewMultisigKey] [getStatus]: ${errStr}`,
        );
      } else {
        if (!status?.wallet) {
          return;
        }
        navigation.navigate('Copayers', {
          wallet: firstWallet,
          status: status.wallet,
        });
      }
    });
  }, [context, firstWallet, logger, navigation]);

  const totalBalance = key?.totalBalance ?? 0;

  const visibleKeyWallets = useMemo(() => {
    return getVisibleWalletsForKey(key);
  }, [key]);
  const cacheEligibleKeyWallets = usePortfolioBalanceChartEligibleWallets({
    wallets: visibleKeyWallets,
    enabled: showPortfolioValue === true,
  });
  const keyChartWalletIds = useMemo(
    () =>
      cacheEligibleKeyWallets
        .map(wallet => wallet.id)
        .filter(Boolean)
        .sort(),
    [cacheEligibleKeyWallets],
  );
  const keyChartScopeIdentity = `${keyChartWalletIds.join(
    ',',
  )}|${quoteCurrency}|${DEFAULT_BALANCE_CHART_TIMEFRAME}`;
  const hasCachedKeyChart = useHasCachedBalanceHistoryChartSeries({
    walletIds: keyChartWalletIds,
    quoteCurrency,
    timeframe: DEFAULT_BALANCE_CHART_TIMEFRAME,
  });
  const renderableKeyWallets = useMemo(
    () => (contentReady ? visibleKeyWallets : []),
    [contentReady, visibleKeyWallets],
  );
  const keyBalanceChartWallets = useMemo(
    () => (contentReady || hasCachedKeyChart ? cacheEligibleKeyWallets : []),
    [cacheEligibleKeyWallets, contentReady, hasCachedKeyChart],
  );
  const {
    canRenderBalanceChart: canRenderKeyBalanceChart,
    shouldMountBalanceChart: shouldMountKeyBalanceChart,
    shouldShowChartLoader: shouldShowKeyChartLoader,
    shouldRenderZeroBalanceChart: shouldRenderZeroKeyBalanceChart,
    shouldPreserveStaleBalanceChart: shouldPreserveStaleKeyBalanceChart,
    isBalanceChartDataReadyToQuery: isKeyBalanceChartDataReadyToQuery,
    chartableWallets: chartableVisibleKeyWallets,
  } = usePortfolioBalanceChartReadiness({
    wallets: keyBalanceChartWallets,
    enabled: (contentReady || hasCachedKeyChart) && showPortfolioValue === true,
    renderZeroBalanceChartWhenNoSnapshots: true,
  });
  const shouldRenderKeyBalanceChart =
    shouldMountKeyBalanceChart || hasCachedKeyChart;
  const visibleKeyWalletIds = useMemo(
    () => visibleKeyWallets.map(wallet => wallet.id).filter(Boolean),
    [visibleKeyWallets],
  );
  const balanceChartSurface = usePortfolioBalanceChartSurface({
    wallets: chartableVisibleKeyWallets,
    quoteCurrency,
    fallbackBalance: totalBalance,
    fallbackCurrency: defaultAltCurrency.isoCode,
    enabled: shouldRenderKeyBalanceChart,
    isBalanceChartDataReadyToQuery: isKeyBalanceChartDataReadyToQuery,
    preserveChartDrivenStateWhileNotReady:
      shouldPreserveStaleKeyBalanceChart || hasCachedKeyChart,
    resetKey: id,
  });
  const legacyLastDayChangeRowData = useLegacyLastDayChangeRowData({
    wallets: renderableKeyWallets,
    currentFiatBalance: totalBalance,
    quoteCurrency: defaultAltCurrency.isoCode,
    enabled: contentReady && showPortfolioValue !== true,
  });
  const keyHeaderChangeRowData =
    showPortfolioValue === true
      ? balanceChartSurface.changeRowData
      : legacyLastDayChangeRowData;
  const hasRenderedKeyChart =
    renderedKeyChartIdentity === keyChartScopeIdentity || hasCachedKeyChart;
  const shouldShowKeyChartPlaceholder =
    showPortfolioValue === true &&
    !hasRenderedKeyChart &&
    !hasCachedKeyChart &&
    cacheEligibleKeyWallets.length > 0;
  const onKeyChartRenderableSeriesChange = useCallback(
    (hasRenderableSeries: boolean) => {
      if (hasRenderableSeries) {
        setRenderedKeyChartIdentity(keyChartScopeIdentity);
      }
    },
    [keyChartScopeIdentity],
  );

  const allocationWalletRows: AllocationWallet[] = useMemo(() => {
    return renderableKeyWallets.map((w: Wallet) => ({
      currencyAbbreviation: w.currencyAbbreviation,
      chain: w.chain,
      tokenAddress: w.tokenAddress,
      currencyName: w.currencyName,
      fiatBalance: (w.balance as any)?.fiat,
    }));
  }, [renderableKeyWallets]);

  const allocationData = useMemo(() => {
    return buildAllocationDataFromWalletRows(
      allocationWalletRows,
      defaultAltCurrency.isoCode,
    );
  }, [allocationWalletRows, defaultAltCurrency.isoCode]);

  const isKeyPopulateLoading = useAppSelector(({PORTFOLIO}) =>
    isPopulateLoadingForWallets({
      populateStatus: PORTFOLIO.populateStatus,
      wallets: renderableKeyWallets,
    }),
  );

  const showAllocationGainLossFooter = canRenderKeyBalanceChart;

  const maybeActivateAllocationGainLoss = useCallback(() => {
    if (shouldLoadAllocationGainLoss || !showAllocationGainLossFooter) {
      return;
    }

    const overviewContainer = overviewContainerRef.current;
    const allocationFooterView = allocationFooterViewRef.current;
    if (
      allocationFooterVisibilityCheckInFlightRef.current ||
      !overviewContainer?.measureInWindow ||
      !allocationFooterView?.measureInWindow
    ) {
      return;
    }

    allocationFooterVisibilityCheckInFlightRef.current = true;

    overviewContainer.measureInWindow(
      (_overviewX, overviewY, _overviewWidth, overviewHeight) => {
        allocationFooterView.measureInWindow(
          (_footerX, footerY, _footerWidth, footerHeight) => {
            allocationFooterVisibilityCheckInFlightRef.current = false;

            const overviewBottom = overviewY + overviewHeight;
            const footerBottom = footerY + footerHeight;
            const isVisible =
              overviewHeight > 0 &&
              footerHeight > 0 &&
              footerBottom >= overviewY &&
              footerY <= overviewBottom;

            if (isVisible) {
              setShouldLoadAllocationGainLoss(true);
            }
          },
        );
      },
    );
  }, [shouldLoadAllocationGainLoss, showAllocationGainLossFooter]);

  const onAllocationFooterLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      maybeActivateAllocationGainLoss();
    },
    [maybeActivateAllocationGainLoss],
  );

  const onOverviewLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      maybeActivateAllocationGainLoss();
    },
    [maybeActivateAllocationGainLoss],
  );

  const onListScroll = useCallback(
    (_event: NativeSyntheticEvent<NativeScrollEvent>) => {
      maybeActivateAllocationGainLoss();
    },
    [maybeActivateAllocationGainLoss],
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

  const handleAddEvmChain = async () => {
    haptic('impactLight');
    await sleep(500);

    let password;
    if (key.isPrivKeyEncrypted) {
      password = await dispatch(getDecryptPassword(Object.assign({}, key)));
    }

    const evmWallets = getEvmGasWallets(key.wallets);
    const accountsArray = [
      ...new Set(evmWallets.map(wallet => wallet.credentials.account)),
    ];

    const wallets = await createWalletsForAccounts(
      dispatch,
      accountsArray,
      key.methods as KeyMethods,
      getBaseEVMAccountCreationCoinsAndTokens(),
      key.wallets,
      password,
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
  };

  const keyOptions: Array<Option> = [];

  if (key && !key.isReadOnly) {
    keyOptions.push({
      img: <Icons.Wallet width="15" height="15" />,
      title: t('Add Wallet'),
      description: t(
        'Choose another currency you would like to add to your key.',
      ),
      onPress: () => {
        haptic('impactLight');
        navigation.navigate('AddingOptions', {
          key,
        });
      },
    });
  }

  if (hasMissingEvmNetworks) {
    keyOptions.push({
      img: <Icons.Wallet width="15" height="15" />,
      title: t('Add Ethereum networks'),
      description: t('Add all supported networks for this key.'),
      onPress: async () => {
        await handleAddEvmChain();
      },
    });
  }

  if (!key?.isReadOnly && !checkPrivateKeyEncrypted(key)) {
    keyOptions.push({
      img: <Icons.Encrypt />,
      title: t('Encrypt your Key'),
      description: t(
        'Prevent an unauthorized user from sending funds out of your wallet.',
      ),
      onPress: () => {
        haptic('impactLight');
        navigation.navigate('CreateEncryptPassword', {
          keyId: key.id,
        });
      },
    });
  }

  keyOptions.push({
    img: <Icons.Settings />,
    title: t('Key Settings'),
    description: t('View all the ways to manage and configure your key.'),
    onPress: () => {
      haptic('impactLight');
      navigation.navigate('KeySettings', {
        keyId: key.id,
      });
    },
  });

  const updateStatusForKey = useCallback(
    async (forceUpdate?: boolean) => {
      if (!key) {
        return;
      }

      while (activeViewUpdateRef.current) {
        const activeUpdate = activeViewUpdateRef.current;
        logger.debug(
          'KeyOverview is updating. Waiting for the active update...',
        );
        try {
          await activeUpdate.promise;
        } catch {}

        if (!forceUpdate && activeUpdate.keyId === key.id) {
          return;
        }
      }

      const updatePromise = (async () => {
        const activeStartupInit = getActiveWalletStoreInitPromise();
        if (!forceUpdate && activeStartupInit) {
          const {walletInitSuccess} = await activeStartupInit;
          if (walletInitSuccess) {
            return;
          }
        }

        await dispatch(startGetRates({force: forceUpdate}) as any);
        await Promise.all([
          dispatch(
            startUpdateAllWalletStatusForKey({
              key,
              force: forceUpdate,
              createTokenWalletWithFunds: forceUpdate,
            }),
          ),
          sleep(1000),
        ]);
        if (key.isReadOnly) {
          dispatch(updatePortfolioBalance());
        }
      })();

      activeViewUpdateRef.current = {
        keyId: key.id,
        promise: updatePromise,
      };

      try {
        await updatePromise;
      } catch {
        dispatch(showBottomNotificationModal(BalanceUpdateError()));
      } finally {
        if (activeViewUpdateRef.current?.promise === updatePromise) {
          activeViewUpdateRef.current = null;
        }
      }
    },
    [dispatch, key, logger],
  );

  const updateStatusForKeyRef = useRef(updateStatusForKey);

  useEffect(() => {
    updateStatusForKeyRef.current = updateStatusForKey;
  }, [updateStatusForKey]);

  useFocusEffect(
    useCallback(() => {
      if (!viewedKeyId) {
        return;
      }

      dispatch(Analytics.track('View Key'));
      updateStatusForKeyRef.current(false);
    }, [dispatch, viewedKeyId]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await updateStatusForKey(true);
      Promise.resolve()
        .then(() =>
          dispatch(
            maybePopulatePortfolioForWallets({
              walletIds: visibleKeyWalletIds,
              quoteCurrency,
              forceRetryQuarantined: true,
            }) as any,
          ),
        )
        .catch(error => {
          logger.warn(
            `[portfolio] Failed background key overview refresh populate: ${formatUnknownError(
              error,
            )}`,
          );
        });
    } catch {
      dispatch(showBottomNotificationModal(BalanceUpdateError()));
    } finally {
      setRefreshing(false);
    }
  };

  const onPressItem = useCallback(
    (item: AccountRowProps) => {
      haptic('impactLight');

      if (IsVMChain(item.chains[0])) {
        navigation.navigate('AccountDetails', {
          keyId: item.keyId,
          selectedAccountAddress: item.receiveAddress,
          isSvmAccount: IsSVMChain(item.chains[0]),
        });
        return;
      }
      const fullWalletObj = key.wallets.find(
        k =>
          k.id === item.wallets[0].id &&
          (!item.copayerId || k.credentials?.copayerId === item.copayerId),
      );
      if (!fullWalletObj) {
        return;
      }
      if (!fullWalletObj.isComplete()) {
        fullWalletObj.getStatus({}, (err, status) => {
          if (err) {
            const errStr =
              err instanceof Error ? err.message : JSON.stringify(err);
            logger.error(
              `error [KeyOverview - onPressItem] [getStatus]: ${errStr}`,
            );
          } else {
            if (status?.wallet?.status === 'complete') {
              fullWalletObj.openWallet({}, () => {
                navigation.navigate('WalletDetails', {
                  walletId: fullWalletObj.credentials.walletId,
                  copayerId: item.copayerId,
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
        });
      } else {
        navigation.navigate('WalletDetails', {
          walletId: fullWalletObj.credentials.walletId,
          copayerId: fullWalletObj.credentials.copayerId,
        });
      }
    },
    [key, logger, navigation],
  );

  const preloadedDetailsRef = useRef<string | undefined>(undefined);
  const preloadDetails = useCallback(
    (item: AccountRowProps) => {
      if (typeof (navigation as any).preload !== 'function') {
        return;
      }

      if (IsVMChain(item.chains[0])) {
        const preloadIdentity = `account:${item.keyId}:${item.receiveAddress}`;
        if (preloadedDetailsRef.current === preloadIdentity) {
          return;
        }

        preloadedDetailsRef.current = preloadIdentity;
        performanceLog(
          `[PERF-PRELOAD] AccountDetails start key:${item.keyId} account:${item.receiveAddress} source:KeyOverview`,
        );
        (navigation as any).preload('AccountDetails', {
          keyId: item.keyId,
          selectedAccountAddress: item.receiveAddress,
          isSvmAccount: IsSVMChain(item.chains[0]),
          _preloadContent: true,
        });
        return;
      }

      const fullWalletObj = key.wallets.find(
        wallet =>
          wallet.id === item.wallets[0].id &&
          (!item.copayerId || wallet.credentials?.copayerId === item.copayerId),
      );
      if (!fullWalletObj?.isComplete()) {
        return;
      }

      const walletId = fullWalletObj.credentials.walletId;
      const copayerId = fullWalletObj.credentials.copayerId;
      const preloadIdentity = `wallet:${walletId}:${copayerId || ''}`;
      if (preloadedDetailsRef.current === preloadIdentity) {
        return;
      }

      preloadedDetailsRef.current = preloadIdentity;
      performanceLog(
        `[PERF-PRELOAD] WalletDetails start wallet:${walletId} source:KeyOverview`,
      );
      (navigation as any).preload('WalletDetails', {
        walletId,
        copayerId,
        _preloadContent: true,
      });
    },
    [key.wallets, navigation],
  );

  const onPressItemRef = useRef(onPressItem);
  onPressItemRef.current = onPressItem;
  const stableOnPressItem = useCallback(
    (item: AccountRowProps) => onPressItemRef.current(item),
    [],
  );
  const preloadDetailsRef = useRef(preloadDetails);
  preloadDetailsRef.current = preloadDetails;
  const stablePreloadDetails = useCallback(
    (item: AccountRowProps) => preloadDetailsRef.current(item),
    [],
  );
  const firstPreloadableDetailsItem = useMemo(
    () =>
      memoizedAccountList.find(item => {
        if (IsVMChain(item.chains[0])) {
          return true;
        }

        return key.wallets.some(
          wallet =>
            wallet.id === item.wallets[0].id &&
            (!item.copayerId ||
              wallet.credentials?.copayerId === item.copayerId) &&
            wallet.isComplete(),
        );
      }),
    [key.wallets, memoizedAccountList],
  );
  const firstPreloadableDetailsItemRef = useRef(firstPreloadableDetailsItem);
  firstPreloadableDetailsItemRef.current = firstPreloadableDetailsItem;
  const firstPreloadableDetailsIdentity = firstPreloadableDetailsItem
    ? `${firstPreloadableDetailsItem.keyId}:${
        firstPreloadableDetailsItem.receiveAddress
      }:${firstPreloadableDetailsItem.wallets[0]?.id || ''}`
    : undefined;

  useFocusEffect(
    useCallback(() => {
      preloadedDetailsRef.current = undefined;
      if (!contentReady || !firstPreloadableDetailsIdentity) {
        return;
      }

      const preloadTask = scheduleAfterTransitionAndIdle({
        navigation: navigation as any,
        transitionFallbackMs: 800,
        idleTimeoutMs: 1200,
        callback: signal => {
          const itemToPreload = firstPreloadableDetailsItemRef.current;
          if (!signal.aborted && itemToPreload) {
            stablePreloadDetails(itemToPreload);
          }
        },
      });

      return preloadTask.cancel;
    }, [
      contentReady,
      firstPreloadableDetailsIdentity,
      navigation,
      stablePreloadDetails,
    ]),
  );

  const memoizedRenderItem = useCallback(
    ({item}: {item: AccountRowProps}) => (
      <AccountListItem
        item={item}
        hideBalance={hideAllBalances}
        animateEntrance={
          !wasPreloadedRef.current && !hydratedFromSnapshotRef.current
        }
        onPressItem={stableOnPressItem}
        onPressInItem={stablePreloadDetails}
      />
    ),
    [hideAllBalances, stableOnPressItem, stablePreloadDetails],
  );

  const listHeaderComponent = useMemo(() => {
    return (
      <PerformanceProfiler
        id="KeyOverview:list-header"
        onRender={logReactProfiler}>
        <BalanceContainer>
          <TouchableOpacity
            onLongPress={() => {
              dispatch(toggleHideAllBalances());
            }}>
            {!hideAllBalances ? (
              <Balance scale={shouldScale(totalBalance)}>
                {formatFiatAmount(
                  balanceChartSurface.displayedTopBalance ?? totalBalance,
                  balanceChartSurface.displayedTopBalanceCurrency,
                  {
                    currencyDisplay: 'symbol',
                  },
                )}
              </Balance>
            ) : (
              <H2>****</H2>
            )}
          </TouchableOpacity>

          {keyHeaderChangeRowData ||
          shouldRenderKeyBalanceChart ||
          shouldShowKeyChartPlaceholder ? (
            <FullWidthBalanceChartContainer>
              <BalanceHeaderSupplement
                changeRowData={keyHeaderChangeRowData}
                reserveChangeRowSpace={
                  shouldRenderKeyBalanceChart || shouldShowKeyChartPlaceholder
                }
              />
              {shouldShowKeyChartPlaceholder ? (
                <BalanceChartLoadingPlaceholder />
              ) : null}
              {shouldRenderKeyBalanceChart ? (
                <View
                  style={
                    shouldShowKeyChartPlaceholder
                      ? styles.hiddenChart
                      : undefined
                  }>
                  <BalanceHistoryChart
                    wallets={chartableVisibleKeyWallets}
                    quoteCurrency={quoteCurrency}
                    rates={rates}
                    timeframeSelectorWidth={timeframeSelectorWidth}
                    showLoaderWhenNoSnapshots={shouldShowKeyChartLoader}
                    renderZeroBalanceWhenNoSnapshots={
                      shouldRenderZeroKeyBalanceChart
                    }
                    isBalanceChartDataReadyToQuery={
                      isKeyBalanceChartDataReadyToQuery
                    }
                    preserveVisibleSeriesWhileNotReady={
                      shouldPreserveStaleKeyBalanceChart || hasCachedKeyChart
                    }
                    showChangeRow={false}
                    onSelectedBalanceChange={
                      balanceChartSurface.chartCallbacks.onSelectedBalanceChange
                    }
                    onChangeRowData={
                      balanceChartSurface.chartCallbacks.onChangeRowData
                    }
                    onRenderableSeriesChange={onKeyChartRenderableSeriesChange}
                  />
                </View>
              ) : null}
            </FullWidthBalanceChartContainer>
          ) : null}
        </BalanceContainer>

        <WalletListHeader>
          <H5>{t('My Wallets')}</H5>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              marginRight: -10,
            }}>
            <SearchComponent<AccountRowProps>
              searchVal={searchVal}
              setSearchVal={setSearchVal}
              searchResults={searchResults}
              setSearchResults={setSearchResults}
              searchFullList={memoizedAccountList}
              context={'keyoverview'}
            />
          </View>
        </WalletListHeader>
      </PerformanceProfiler>
    );
  }, [
    chartableVisibleKeyWallets,
    dispatch,
    balanceChartSurface,
    keyHeaderChangeRowData,
    hasCachedKeyChart,
    hideAllBalances,
    memoizedAccountList,
    onKeyChartRenderableSeriesChange,
    quoteCurrency,
    rates,
    searchResults,
    searchVal,
    isKeyBalanceChartDataReadyToQuery,
    shouldRenderKeyBalanceChart,
    shouldShowKeyChartPlaceholder,
    shouldPreserveStaleKeyBalanceChart,
    shouldRenderZeroKeyBalanceChart,
    shouldShowKeyChartLoader,
    t,
    timeframeSelectorWidth,
    totalBalance,
  ]);

  const renderListFooterComponent = useCallback(() => {
    return (
      <WalletListFooterContainer>
        <Button
          buttonStyle="secondary"
          height={50}
          buttonOutline
          onPress={() =>
            (navigation as any).navigate('AllAssets', {keyId: id})
          }>
          See All Assets
        </Button>

        {key && !key.isReadOnly && !isTSSKey(key) ? (
          <AddWalletLinkContainer>
            <AddWalletLinkButton
              activeOpacity={ActiveOpacity}
              onPress={async () => {
                haptic('impactLight');
                navigation.navigate('AddingOptions', {
                  key,
                });
              }}>
              <AddWalletLink>Add Wallet</AddWalletLink>
            </AddWalletLinkButton>
          </AddWalletLinkContainer>
        ) : key ? (
          <AddWalletSpacer />
        ) : null}

        {showPortfolioValue && allocationData.totalFiat > 0 ? (
          <TouchableOpacity
            activeOpacity={ActiveOpacity}
            onPress={() =>
              (navigation as any).navigate('Allocation', {
                keyId: key.id,
              })
            }>
            <AllocationDonutLegendCard
              legendItems={allocationData.legendItems}
              slices={allocationData.slices}
              style={{marginLeft: 0, marginRight: 0}}
              header={
                <AllocationHeader>
                  <HomeSectionTitle>Allocation</HomeSectionTitle>
                  <AllocationHeaderAction
                    activeOpacity={ActiveOpacity}
                    onPress={() =>
                      (navigation as any).navigate('Allocation', {
                        keyId: id,
                      })
                    }>
                    <ChevronRightSvg width={13} height={19} gray />
                  </AllocationHeaderAction>
                </AllocationHeader>
              }
              footer={
                <AllocationFooter>
                  <AllocationLabel>Portfolio Value</AllocationLabel>
                  <AllocationValue>
                    {!hideAllBalances
                      ? formatFiatAmount(
                          totalBalance,
                          defaultAltCurrency.isoCode,
                          {
                            currencyDisplay: 'symbol',
                          },
                        )
                      : '****'}
                  </AllocationValue>

                  {showAllocationGainLossFooter &&
                  shouldLoadAllocationGainLoss ? (
                    <KeyOverviewAllocationGainLossFooter
                      hideAllBalances={hideAllBalances}
                      isPopulateLoading={isKeyPopulateLoading}
                      liveFiatTotal={totalBalance}
                      wallets={visibleKeyWallets}
                    />
                  ) : null}
                </AllocationFooter>
              }
            />
          </TouchableOpacity>
        ) : null}

        {showArchaxBanner && <ArchaxFooter />}
      </WalletListFooterContainer>
    );
  }, [
    allocationData.legendItems,
    allocationData.slices,
    allocationData.totalFiat,
    defaultAltCurrency.isoCode,
    hideAllBalances,
    id,
    isKeyPopulateLoading,
    key,
    navigation,
    shouldLoadAllocationGainLoss,
    showPortfolioValue,
    showArchaxBanner,
    showAllocationGainLossFooter,
    totalBalance,
    visibleKeyWallets,
  ]);

  const listEmptyComponent = useMemo(
    () =>
      contentReady ? (
        <EmptyListContainer>
          <H5>{t("It's a ghost town in here")}</H5>
          <GhostSvg style={{marginTop: 20}} />
        </EmptyListContainer>
      ) : null,
    [contentReady, t],
  );

  const renderDataComponent = useMemo(() => {
    return !searchVal && !selectedChainFilterOption
      ? memoizedAccountList
      : searchResults;
  }, [
    memoizedAccountList,
    searchResults,
    searchVal,
    selectedChainFilterOption,
  ]);

  const accountKeyExtractor = useCallback(
    (item: AccountRowProps) => item.id,
    [],
  );

  const [footerReady, setFooterReady] = useState(false);

  useEffect(() => {
    if (!contentReady || footerReady) {
      return;
    }

    const frame = requestAnimationFrame(() => setFooterReady(true));

    return () => cancelAnimationFrame(frame);
  }, [contentReady, footerReady]);

  const listFooterComponent = useMemo(() => {
    if (!footerReady) {
      return null;
    }

    return (
      <PerformanceProfiler
        id="KeyOverview:list-footer"
        onRender={logReactProfiler}>
        <View ref={allocationFooterViewRef} onLayout={onAllocationFooterLayout}>
          {renderListFooterComponent()}
        </View>
      </PerformanceProfiler>
    );
  }, [footerReady, onAllocationFooterLayout, renderListFooterComponent]);

  return (
    <OverviewContainer ref={overviewContainerRef} onLayout={onOverviewLayout}>
      <FlashList<AccountRowProps>
        refreshControl={
          <RefreshControl
            tintColor={theme.dark ? White : SlateDark}
            refreshing={refreshing}
            onRefresh={() => onRefresh()}
          />
        }
        onScroll={onListScroll}
        scrollEventThrottle={32}
        ListHeaderComponent={listHeaderComponent}
        ListFooterComponent={listFooterComponent}
        data={renderDataComponent}
        extraData={hideAllBalances}
        keyExtractor={accountKeyExtractor}
        renderItem={memoizedRenderItem}
        ListEmptyComponent={listEmptyComponent}
      />

      {keyOptions.length > 0 ? (
        <OptionsSheet
          isVisible={showKeyOptions}
          title={t('Key Options')}
          options={keyOptions}
          closeModal={() => setShowKeyOptions(false)}
        />
      ) : null}

      <SheetModal
        isVisible={showKeyDropdown}
        placement={'top'}
        onBackdropPress={() => setShowKeyDropdown(false)}>
        <KeyDropdown>
          <HeaderTitle style={{margin: 15}}>{t('Other Keys')}</HeaderTitle>
          <KeyDropdownOptionsContainer>
            {showKeyDropdown ? (
              <OtherKeyDropdownOptions
                currentKeyId={id}
                defaultAltCurrencyIsoCode={defaultAltCurrency.isoCode}
                hideKeyBalance={hideAllBalances}
                onSelectKey={keyId => {
                  setShowKeyDropdown(false);
                  navigation.setParams({
                    id: keyId,
                  } as any);
                }}
              />
            ) : null}
            {linkedCoinbase ? (
              <CoinbaseDropdownOption
                onPress={() => {
                  setShowKeyDropdown(false);
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
          </KeyDropdownOptionsContainer>
        </KeyDropdown>
      </SheetModal>
    </OverviewContainer>
  );
};

export default KeyOverview;
