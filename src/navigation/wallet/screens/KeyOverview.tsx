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
  useIsFocused,
  useNavigation,
  useRoute,
  useTheme,
} from '@react-navigation/native';
import {FlashList} from '@shopify/flash-list';
import {
  LayoutChangeEvent,
  LogBox,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  View,
  useWindowDimensions,
} from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {TouchableOpacity} from 'react-native-gesture-handler';
import styled from 'styled-components/native';
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
import {RootState} from '../../../store';
import {
  showBottomNotificationModal,
  toggleHideAllBalances,
} from '../../../store/app/app.actions';
import {selectShowPortfolioValue} from '../../../store/app/app.selectors';
import {maybePopulatePortfolioForWallets} from '../../../store/portfolio';
import {selectCanRenderPortfolioBalanceCharts} from '../../../store/portfolio/portfolio.selectors';
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
  getDecryptPassword,
  refreshRatesForPortfolioPnl,
  normalizeMnemonic,
  serverAssistedImport,
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
import {getTimeframeSelectorWidth} from '../../../components/charts/timeframeSelectorWidth';
import usePortfolioBalanceChartSurface from '../../../portfolio/ui/hooks/usePortfolioBalanceChartSurface';
import usePortfolioChartableWallets from '../../../portfolio/ui/hooks/usePortfolioChartableWallets';
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
  walletsHaveNonZeroLiveBalance,
} from '../../../utils/portfolio/assets';
import usePortfolioGainLossSummary from '../../../portfolio/ui/hooks/usePortfolioGainLossSummary';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

export const KeyToggle = styled(TouchableOpacity)`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  gap: 5px;
`;

export const KeyDropdown = styled.SafeAreaView`
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  max-height: 75%;
`;

export const KeyDropdownOptionsContainer = styled.ScrollView`
  padding: 0 ${ScreenGutter};
`;

export const CogIconContainer = styled(TouchableOpacity)`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 50px;
  justify-content: center;
  align-items: center;
  height: 40px;
  width: 40px;
`;

const OverviewContainer = styled.SafeAreaView`
  flex: 1;
`;

const BalanceContainer = styled.View`
  margin-top: 8px;
  padding: 10px 15px;
  align-items: center;
`;

const WalletListHeader = styled.View`
  padding: 10px;
  margin-top: 10px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const WalletListFooterContainer = styled.View`
  padding: 10px 10px 100px 10px;
  margin-top: 15px;
  gap: 12px;
`;

const AddWalletLinkContainer = styled.View`
  padding: 13px 0;
  align-items: center;
  margin-bottom: 15px;
`;

const AddWalletLink = styled(Link).attrs(() => ({
  suppressHighlighting: true,
}))`
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: 24px;
`;

const AddWalletLinkButton = styled(TouchableOpacity)`
  padding: 0 20px;
`;

const AllocationHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 10px;
`;

const AllocationHeaderAction = styled(TouchableOpacity)`
  padding: 6px;
`;

const AllocationFooter = styled.View`
  margin-top: 20px;
  padding-bottom: 5px;
`;

const AllocationDivider = styled.View`
  height: 1px;
  background-color: ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
  opacity: 1;
  margin: 12px 0;
`;

const AllocationLabel = styled(BaseText)`
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 14px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const AllocationValue = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: 24px;
  color: ${({theme}) => theme.colors.text};
  margin-top: 4px;
`;

const AllocationRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
`;

const AllocationColumn = styled.View`
  flex: 1;
`;

const AllocationMetricValue = styled(BaseText)<{positive?: boolean}>`
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px;
  margin-top: 4px;
  color: ${({positive, theme: {dark}}) => {
    if (positive === true) {
      return getDifferenceColor(true, dark);
    }
    if (positive === false) {
      return getDifferenceColor(false, dark);
    }
    return dark ? White : SlateDark;
  }};
`;

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

const HeaderTitleContainer = styled.View`
  flex-direction: row;
  align-items: center;
`;

const HeaderRightContainer = styled(_HeaderRightContainer)`
  flex-direction: row;
  align-items: center;
`;

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

    const allTimeIsPositive = useMemo(() => {
      return gainLossSummary.total.available
        ? gainLossSummary.total.deltaFiat >= 0
        : true;
    }, [gainLossSummary.total.available, gainLossSummary.total.deltaFiat]);

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

    const todayIsPositive = useMemo(() => {
      return gainLossSummary.today.available
        ? gainLossSummary.today.deltaFiat >= 0
        : true;
    }, [gainLossSummary.today.available, gainLossSummary.today.deltaFiat]);

    const showAllTimeGainLossSkeleton = useMemo(() => {
      return (
        isPopulateLoading ||
        (isGainLossSummaryLoading && allTimeGainLossText === null)
      );
    }, [allTimeGainLossText, isGainLossSummaryLoading, isPopulateLoading]);

    const showTodayGainLossSkeleton = useMemo(() => {
      return (
        isPopulateLoading ||
        (isGainLossSummaryLoading && todayGainLossText === null)
      );
    }, [isGainLossSummaryLoading, isPopulateLoading, todayGainLossText]);

    const showAllTimeGainLossColumn = useMemo(() => {
      return allTimeGainLossText !== null || showAllTimeGainLossSkeleton;
    }, [allTimeGainLossText, showAllTimeGainLossSkeleton]);

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
  const {
    params: {id, context},
  } = useRoute<RouteProp<WalletGroupParamList, 'KeyOverview'>>();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const theme = useTheme();
  const isFocused = useIsFocused();
  const {width: windowWidth} = useWindowDimensions();
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const {tokenOptionsByAddress} = useTokenContext();
  const [showKeyOptions, setShowKeyOptions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const {keys}: {keys: {[key: string]: Key}} = useAppSelector(
    ({WALLET}) => WALLET,
  );
  const {rates} = useAppSelector(({RATE}) => RATE);
  const {defaultAltCurrency, hideAllBalances} = useAppSelector(({APP}) => APP);
  const showPortfolioValue = useAppSelector(selectShowPortfolioValue);
  const canRenderPortfolioBalanceCharts = useAppSelector(
    selectCanRenderPortfolioBalanceCharts,
  );
  const portfolio = useAppSelector(({PORTFOLIO}) => PORTFOLIO);
  const linkedCoinbase = useAppSelector(
    ({COINBASE}) => !!COINBASE.token[COINBASE_ENV],
  );
  const timeframeSelectorWidth = getTimeframeSelectorWidth(
    windowWidth,
    ScreenGutter,
  );

  const [showKeyDropdown, setShowKeyDropdown] = useState(false);
  const key = keys[id];
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
  const hasMultipleKeys =
    Object.values(keys).filter(k => k.backupComplete).length > 1;
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [searchVal, setSearchVal] = useState('');
  const [isViewUpdating, setIsViewUpdating] = useState(false);
  const [searchResults, setSearchResults] = useState([] as AccountRowProps[]);
  const selectedChainFilterOption = useAppSelector(
    ({APP}) => APP.selectedChainFilterOption,
  );
  const quoteCurrency = useMemo(() => {
    return getQuoteCurrency({
      portfolioQuoteCurrency: portfolio.quoteCurrency,
      defaultAltCurrencyIsoCode: defaultAltCurrency?.isoCode,
    });
  }, [defaultAltCurrency?.isoCode, portfolio.quoteCurrency]);

  const memoizedAccountList = useMemo(() => {
    return buildAccountList(key, defaultAltCurrency.isoCode, rates, dispatch, {
      filterByHideWallet: true,
    });
  }, [dispatch, key, defaultAltCurrency.isoCode, rates]);

  const pendingTxpCount = useMemo(() => {
    return (
      key?.wallets.reduce((count, wallet) => {
        return count + (wallet.pendingTxps?.length || 0);
      }, 0) || 0
    );
  }, [key?.wallets]);

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
    if (!key) {
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
                  onPress={async () => {
                    await sleep(500);
                    navigation.navigate('KeySettings', {
                      key,
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

  const {totalBalance = 0} =
    useAppSelector(({WALLET}) => WALLET.keys[id]) || {};

  const visibleKeyWallets = useMemo(() => {
    return getVisibleWalletsForKey(key);
  }, [key]);
  const chartableVisibleKeyWallets = usePortfolioChartableWallets({
    wallets: visibleKeyWallets,
    enabled: canRenderPortfolioBalanceCharts,
  });
  const hasAnyVisibleKeyWalletBalance = useMemo(() => {
    return walletsHaveNonZeroLiveBalance(chartableVisibleKeyWallets);
  }, [chartableVisibleKeyWallets]);
  const canRenderKeyBalanceChart =
    canRenderPortfolioBalanceCharts && hasAnyVisibleKeyWalletBalance;
  const visibleKeyWalletIds = useMemo(
    () => visibleKeyWallets.map(wallet => wallet.id).filter(Boolean),
    [visibleKeyWallets],
  );
  const balanceChartSurface = usePortfolioBalanceChartSurface({
    wallets: chartableVisibleKeyWallets,
    quoteCurrency,
    fallbackBalance: totalBalance,
    fallbackCurrency: defaultAltCurrency.isoCode,
    enabled: canRenderKeyBalanceChart,
    resetKey: id,
  });

  const allocationWalletRows: AllocationWallet[] = useMemo(() => {
    return visibleKeyWallets.map((w: Wallet) => {
      return {
        currencyAbbreviation: w.currencyAbbreviation,
        chain: w.chain,
        tokenAddress: w.tokenAddress,
        currencyName: w.currencyName,
        fiatBalance: (w.balance as any)?.fiat,
      };
    });
  }, [visibleKeyWallets]);

  const allocationData = useMemo(() => {
    return buildAllocationDataFromWalletRows(
      allocationWalletRows,
      defaultAltCurrency.isoCode,
    );
  }, [allocationWalletRows, defaultAltCurrency.isoCode]);

  const isKeyPopulateLoading = useMemo(() => {
    return isPopulateLoadingForWallets({
      populateStatus: portfolio.populateStatus,
      wallets: visibleKeyWallets,
    });
  }, [portfolio.populateStatus, visibleKeyWallets]);

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

  const _tokenOptionsByAddress = useAppSelector(({WALLET}: RootState) => {
    return {
      ...BitpaySupportedTokenOptsByAddress,
      ...tokenOptionsByAddress,
      ...WALLET.customTokenOptionsByAddress,
    };
  });

  const startSyncWallets = async (mnemonic: string) => {
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
                _tokenOptionsByAddress,
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

  keyOptions.push({
    img: <Icons.Wallet width="15" height="15" />,
    title: t('Add Wallet'),
    description: t(
      'Choose another currency you would like to add to your key.',
    ),
    onPress: async () => {
      haptic('impactLight');
      await sleep(500);
      navigation.navigate('AddingOptions', {
        key,
      });
    },
  });

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
      onPress: async () => {
        haptic('impactLight');
        await sleep(500);
        navigation.navigate('CreateEncryptPassword', {
          key,
        });
      },
    });
  }

  keyOptions.push({
    img: <Icons.Settings />,
    title: t('Key Settings'),
    description: t('View all the ways to manage and configure your key.'),
    onPress: async () => {
      haptic('impactLight');
      await sleep(500);
      navigation.navigate('KeySettings', {
        key,
      });
    },
  });

  const updateStatusForKey = useCallback(
    async (forceUpdate?: boolean) => {
      if (!key) {
        return;
      }
      if (isViewUpdating) {
        logger.debug(
          'KeyOverview is updating. Do not start forced updateAll...',
        );
        return;
      }

      try {
        setIsViewUpdating(true);
        await dispatch(
          refreshRatesForPortfolioPnl({context: 'homeRootOnRefresh'}) as any,
        );
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
        dispatch(updatePortfolioBalance());
        setIsViewUpdating(false);
      } catch {
        setIsViewUpdating(false);
        dispatch(showBottomNotificationModal(BalanceUpdateError()));
      }
    },
    [dispatch, isViewUpdating, key, logger],
  );

  const updateStatusForKeyRef = useRef(updateStatusForKey);

  useEffect(() => {
    updateStatusForKeyRef.current = updateStatusForKey;
  }, [updateStatusForKey]);

  useEffect(() => {
    if (!isFocused || !viewedKeyId) {
      return;
    }

    dispatch(Analytics.track('View Key'));
    updateStatusForKeyRef.current(false);
  }, [dispatch, isFocused, viewedKeyId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await updateStatusForKey(true);
      await dispatch(
        maybePopulatePortfolioForWallets({
          walletIds: visibleKeyWalletIds,
          quoteCurrency,
        }) as any,
      );
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
      )!;
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
                  key,
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
          key,
          walletId: fullWalletObj.credentials.walletId,
          copayerId: fullWalletObj.credentials.copayerId,
        });
      }
    },
    [key, logger, navigation],
  );

  const memoizedRenderItem = useCallback(
    ({item}: {item: AccountRowProps}) => {
      return (
        <AccountListRow
          id={item.id}
          accountItem={item}
          hideBalance={hideAllBalances}
          onPress={() => {
            onPressItem(item);
          }}
        />
      );
    },
    [hideAllBalances, onPressItem],
  );

  const listHeaderComponent = useMemo(() => {
    return (
      <>
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

          {canRenderKeyBalanceChart && !hideAllBalances ? (
            <BalanceHistoryChart
              wallets={chartableVisibleKeyWallets}
              quoteCurrency={quoteCurrency}
              rates={rates}
              timeframeSelectorWidth={timeframeSelectorWidth}
              onSelectedBalanceChange={
                balanceChartSurface.chartCallbacks.onSelectedBalanceChange
              }
            />
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
              setSearchResults={nextSearchResults => {
                setSearchResults(nextSearchResults);
                setIsLoadingInitial(false);
              }}
              searchFullList={memoizedAccountList}
              context={'keyoverview'}
            />
          </View>
        </WalletListHeader>
      </>
    );
  }, [
    canRenderKeyBalanceChart,
    defaultAltCurrency.isoCode,
    dispatch,
    balanceChartSurface,
    hideAllBalances,
    memoizedAccountList,
    quoteCurrency,
    rates,
    searchResults,
    searchVal,
    t,
    timeframeSelectorWidth,
    totalBalance,
    visibleKeyWallets,
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

        {!isTSSKey(key) ? (
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
      !isLoadingInitial ? (
        <EmptyListContainer>
          <H5>{t("It's a ghost town in here")}</H5>
          <GhostSvg style={{marginTop: 20}} />
        </EmptyListContainer>
      ) : null,
    [t, isLoadingInitial],
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

  const listFooterComponent = useMemo(() => {
    return (
      <View ref={allocationFooterViewRef} onLayout={onAllocationFooterLayout}>
        {renderListFooterComponent()}
      </View>
    );
  }, [onAllocationFooterLayout, renderListFooterComponent]);

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
            {Object.values(keys)
              .filter(_key => _key.backupComplete && _key.id !== id)
              .map(_key => (
                <DropdownOption
                  key={_key.id}
                  optionId={_key.id}
                  optionName={_key.keyName}
                  wallets={_key.wallets}
                  totalBalance={_key.totalBalance}
                  onPress={keyId => {
                    setShowKeyDropdown(false);
                    navigation.setParams({
                      id: keyId,
                    } as any);
                  }}
                  defaultAltCurrencyIsoCode={defaultAltCurrency.isoCode}
                  hideKeyBalance={hideAllBalances}
                />
              ))}
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
