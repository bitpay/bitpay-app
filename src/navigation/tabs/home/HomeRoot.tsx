import {useIsFocused, useScrollToTop, useTheme} from '@react-navigation/native';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  AppState,
  AppStateStatus,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {createSelector} from 'reselect';
import {
  EXCHANGE_RATES_CURRENCIES,
  STATIC_CONTENT_CARDS_ENABLED,
} from '../../../constants/config';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import {
  setShowKeyMigrationFailureModal,
  setShowKycGetVerifiedModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {requestBrazeContentRefresh} from '../../../store/app/app.effects';
import {
  selectBrazeMarketingCarousel,
  selectBrazeShopWithCrypto,
} from '../../../store/app/app.selectors';
import {maybePopulatePortfolioOnAppLaunch} from '../../../store/portfolio';
import {getAndDispatchUpdatedWalletBalances} from '../../../store/wallet/effects/status/statusv2';
import {refreshRatesForPortfolioPnl} from '../../../store/wallet/effects';
import {SlateDark, White} from '../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import useRuntimeFiatRateSeriesCache from '../../../portfolio/ui/hooks/useRuntimeFiatRateSeriesCache';
import type {FiatRateCacheRequest} from '../../../portfolio/core/fiatRatesShared';
import {BalanceUpdateError} from '../../wallet/components/ErrorMessages';
import Crypto from './components/Crypto';
import ExchangeRatesList from './components/exchange-rates/ExchangeRatesList';
import ProfileButton from './components/HeaderProfileButton';
import ScanButton from './components/HeaderScanButton';
import HomeSection from './components/HomeSection';
import LinkingButtons from './components/LinkingButtons';
import MockOffers from './components/offers/MockOffers';
import OffersCarousel from './components/offers/OffersCarousel';
import MarketingCarousel from './components/MarketingCarousel';
import PortfolioBalance from './components/PortfolioBalance';
import {HeaderContainer, HeaderLeftContainer} from './components/Styled';
import KeyMigrationFailureModal from './components/KeyMigrationFailureModal';
import {ProposalBadgeContainer} from '../../../components/styled/Containers';
import {ProposalBadge} from '../../../components/styled/Text';
import {
  receiveCrypto,
  sendCrypto,
} from '../../../store/wallet/effects/send/send';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {SumSubSelectors} from '../../../store/sumsub';
import GetVerifiedModal from './components/GetVerifiedModal';
import {withErrorFallback} from '../TabScreenErrorFallback';
import TabContainer from '../TabContainer';
import ArchaxFooter from '../../../components/archax/archax-footer';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../Root';
import {TabsScreens, TabsStackParamList} from '../TabsStack';
import {
  BitpaySupportedCoins,
  BitpaySupportedTokens,
} from '../../../constants/currencies';
import {HISTORIC_RATES_CACHE_DURATION} from '../../../constants/wallet';
import SecurePasskeyBannerGate from './components/SecurePasskeyBannerGate';
import KycBannerGate from './components/KycBannerGate';
import DefaultMarketingCards from './components/DefaultMarketingCards';
import AllocationSection from './components/AllocationSection';
import AssetsSection from './components/AssetsSection';
import {selectShowPortfolioValue} from '../../../store/app/app.selectors';
import {getCoinAndChainFromCurrencyCode} from '../../bitpay-id/utils/bitpay-id-utils';
import {getPortfolioAllocationTotalFiat} from '../../../utils/portfolio/allocation';
import type {Key} from '../../../store/wallet/wallet.models';
import type {Rates} from '../../../store/rate/rate.models';
import {
  getQuoteCurrency,
  getVisibleWalletsFromKeys,
  walletsHaveNonZeroLiveBalance,
} from '../../../utils/portfolio/assets';
import {sortNewestFirst} from '../../../utils/braze';
import buildHomeExchangeRateItems from './homeExchangeRates';
import {logManager} from '../../../managers/LogManager';
import {formatUnknownError} from '../../../utils/errors/formatUnknownError';
import type {RootState} from '../../../store';
import {logReactProfiler} from '../../../utils/reactPerformanceProfiler';
import PerformanceProfiler from '../../../components/performance/PerformanceProfiler';

export type HomeScreenProps = NativeStackScreenProps<
  TabsStackParamList,
  TabsScreens.HOME
>;

const HOME_DEFERRED_PRELOAD_DISTANCE = 160;
const HOME_PORTFOLIO_PLACEHOLDER_HEIGHT = 560;
const HOME_DISCOVER_PLACEHOLDER_HEIGHT = 640;
const EMPTY_HOME_KEYS: Record<string, Key> = {};
const EMPTY_HOME_CAROUSEL_CONFIG: [] = [];
const EMPTY_HOME_RATES: Rates = {};

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
  },
  portfolioPlaceholder: {
    minHeight: HOME_PORTFOLIO_PLACEHOLDER_HEIGHT,
  },
  discoverPlaceholder: {
    minHeight: HOME_DISCOVER_PLACEHOLDER_HEIGHT,
  },
});

const selectHomeKeys = ({WALLET}: RootState) =>
  WALLET.keys as Record<string, Key>;

const selectHasHomeKeys = createSelector(
  [selectHomeKeys],
  keys => Object.keys(keys).length > 0,
);

const selectPendingTransactionProposalCount = createSelector(
  [selectHomeKeys],
  keys =>
    Object.values(keys).reduce(
      (count, key) =>
        count +
        key.wallets.reduce(
          (walletCount, wallet) =>
            walletCount + (wallet.pendingTxps?.length || 0),
          0,
        ),
      0,
    ),
);

type ExchangeRatesReload = (options: {
  force?: boolean;
  silent?: boolean;
}) => Promise<unknown>;

const HomePendingTransactionProposalBadge = React.memo(
  ({onPress}: {onPress: () => void}) => {
    const pendingTxpCount = useAppSelector(
      selectPendingTransactionProposalCount,
    );

    if (!pendingTxpCount) {
      return null;
    }

    return (
      <ProposalBadgeContainer onPress={onPress} style={{marginRight: 8}}>
        <ProposalBadge>{pendingTxpCount}</ProposalBadge>
      </ProposalBadgeContainer>
    );
  },
);

const HomeMarketingSection = React.memo(() => {
  const brazeMarketingCarousel = useAppSelector(selectBrazeMarketingCarousel);
  const marketingCards = useMemo(() => {
    const cards =
      STATIC_CONTENT_CARDS_ENABLED && !brazeMarketingCarousel.length
        ? DefaultMarketingCards()
        : brazeMarketingCarousel;

    return [...cards].sort(sortNewestFirst);
  }, [brazeMarketingCarousel]);

  if (!marketingCards.length) {
    return null;
  }

  return (
    <HomeSection>
      <MarketingCarousel contentCards={marketingCards} />
    </HomeSection>
  );
});

const HomeOffersSection = React.memo(() => {
  const {t} = useTranslation();
  const brazeShopWithCrypto = useAppSelector(selectBrazeShopWithCrypto);
  const shopWithCryptoCards = useMemo(() => {
    const cardsWithCoverImage = brazeShopWithCrypto.filter(
      card => card.extras?.cover_image,
    );

    const cards =
      STATIC_CONTENT_CARDS_ENABLED && !cardsWithCoverImage.length
        ? MockOffers()
        : cardsWithCoverImage;

    return [...cards].sort(sortNewestFirst);
  }, [brazeShopWithCrypto]);

  if (!shopWithCryptoCards.length) {
    return null;
  }

  return (
    <HomeSection style={{marginBottom: -8}} title={t('Do More')}>
      <OffersCarousel contentCards={shopWithCryptoCards} />
    </HomeSection>
  );
});

const HomeAllocationSection = React.memo(() => {
  const showPortfolioValue = useAppSelector(selectShowPortfolioValue);
  const keys = useAppSelector(({WALLET}) =>
    showPortfolioValue ? WALLET.keys : EMPTY_HOME_KEYS,
  ) as Record<string, Key>;
  const homeCarouselConfig = useAppSelector(({APP}) =>
    showPortfolioValue ? APP.homeCarouselConfig : EMPTY_HOME_CAROUSEL_CONFIG,
  );

  const portfolioAllocationTotalFiat = useMemo(
    () =>
      getPortfolioAllocationTotalFiat({
        keys,
        homeCarouselConfig,
      }),
    [homeCarouselConfig, keys],
  );
  const visibleWallets = useMemo(
    () => getVisibleWalletsFromKeys(keys, homeCarouselConfig),
    [homeCarouselConfig, keys],
  );
  const hasAnyVisibleWalletBalance = useMemo(
    () => walletsHaveNonZeroLiveBalance(visibleWallets),
    [visibleWallets],
  );

  if (
    !showPortfolioValue ||
    (portfolioAllocationTotalFiat <= 0 && !hasAnyVisibleWalletBalance)
  ) {
    return null;
  }

  return (
    <HomeSection>
      <AllocationSection />
    </HomeSection>
  );
});

const HomeAssetsSection = React.memo(({active}: {active: boolean}) => (
  <AssetsSection active={active} />
));

const HomeArchaxFooter = React.memo(() => {
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  return showArchaxBanner ? <ArchaxFooter /> : null;
});

type HomeExchangeRatesSectionProps = {
  currencyAbbreviation?: string;
  navigation: HomeScreenProps['navigation'];
  forceReloadOnMountRef: React.MutableRefObject<boolean>;
  reloadRef: React.MutableRefObject<ExchangeRatesReload | undefined>;
  active: boolean;
  visible: boolean;
};

const HomeExchangeRatesSection = React.memo(
  ({
    currencyAbbreviation,
    navigation,
    forceReloadOnMountRef,
    reloadRef,
    active,
    visible,
  }: HomeExchangeRatesSectionProps) => {
    const {t} = useTranslation();
    const defaultAltCurrency = useAppSelector(
      ({APP}) => APP.defaultAltCurrency,
    );
    const portfolioQuoteCurrency = useAppSelector(
      ({PORTFOLIO}) => PORTFOLIO.quoteCurrency,
    );
    const subscribedRates = useAppSelector(({RATE}) =>
      active ? RATE.rates : EMPTY_HOME_RATES,
    ) as Rates;
    const subscribedLastDayRates = useAppSelector(({RATE}) =>
      active ? RATE.lastDayRates : EMPTY_HOME_RATES,
    ) as Rates;
    const lastActiveRatesRef = useRef(subscribedRates);
    const lastActiveLastDayRatesRef = useRef(subscribedLastDayRates);
    if (active) {
      lastActiveRatesRef.current = subscribedRates;
      lastActiveLastDayRatesRef.current = subscribedLastDayRates;
    }
    const rates = lastActiveRatesRef.current;
    const lastDayRates = lastActiveLastDayRatesRef.current;
    const quoteCurrency = getQuoteCurrency({
      portfolioQuoteCurrency,
      defaultAltCurrencyIsoCode: defaultAltCurrency?.isoCode,
    }).toUpperCase();
    const exchangeRateHistoricalRequests = useMemo<FiatRateCacheRequest[]>(
      () =>
        EXCHANGE_RATES_CURRENCIES.map(coin => ({
          coin,
          intervals: ['1D'],
        })),
      [],
    );
    const forceInitialRateSeriesReload = forceReloadOnMountRef.current;
    const {cache: fiatRateSeriesCache, reload: reloadFiatRateSeriesCache} =
      useRuntimeFiatRateSeriesCache({
        quoteCurrency,
        requests: exchangeRateHistoricalRequests,
        maxAgeMs: HISTORIC_RATES_CACHE_DURATION * 1000,
        enabled: active,
        forceOnInitialLoad: forceInitialRateSeriesReload,
        retainCacheWhenDisabled: true,
      });
    const exchangeRates = useMemo(
      () =>
        buildHomeExchangeRateItems({
          fiatRateSeriesCache,
          lastDayRates,
          rates,
          quoteCurrency,
          exchangeRateCurrencies: EXCHANGE_RATES_CURRENCIES,
          supportedCurrencyOptions: SupportedCurrencyOptions,
          isStableCoinCurrencyName: currencyName =>
            !!(
              BitpaySupportedCoins[currencyName]?.properties?.isStableCoin ||
              BitpaySupportedTokens[currencyName]?.properties?.isStableCoin
            ),
        }),
      [fiatRateSeriesCache, lastDayRates, quoteCurrency, rates],
    );
    const exchangeRatesRef = useRef(exchangeRates);

    useEffect(() => {
      exchangeRatesRef.current = exchangeRates;
    }, [exchangeRates]);

    useEffect(() => {
      reloadRef.current = reloadFiatRateSeriesCache;
      if (forceInitialRateSeriesReload) {
        forceReloadOnMountRef.current = false;
      }
      return () => {
        if (reloadRef.current === reloadFiatRateSeriesCache) {
          reloadRef.current = undefined;
        }
      };
    }, [
      forceInitialRateSeriesReload,
      forceReloadOnMountRef,
      reloadFiatRateSeriesCache,
      reloadRef,
    ]);

    useEffect(() => {
      if (!active) {
        return;
      }

      return navigation.addListener('focus', () => {
        reloadFiatRateSeriesCache({silent: true}).catch(() => undefined);
      });
    }, [active, navigation, reloadFiatRateSeriesCache]);

    const handleAppStateChange = useCallback(
      (status: AppStateStatus) => {
        if (status !== 'active' || !currencyAbbreviation) {
          return;
        }

        navigation.setParams({
          currencyAbbreviation: undefined,
        });

        const {coin: targetAbbreviation} =
          getCoinAndChainFromCurrencyCode(currencyAbbreviation);
        const exchangeRatesSection = exchangeRatesRef.current.find(
          ({currencyAbbreviation: abbr}) =>
            abbr.toLowerCase() === targetAbbreviation,
        );

        if (!exchangeRatesSection) {
          return;
        }

        navigation
          .getParent<NativeStackNavigationProp<RootStackParamList>>()
          ?.navigate('ExchangeRate', {
            currencyName: exchangeRatesSection.currencyName,
            currencyAbbreviation: exchangeRatesSection.currencyAbbreviation,
            chain: exchangeRatesSection.chain,
            tokenAddress: exchangeRatesSection.tokenAddress,
          });
      },
      [currencyAbbreviation, navigation],
    );

    useEffect(() => {
      const subscriptionAppStateChange = AppState.addEventListener(
        'change',
        handleAppStateChange,
      );

      return () => subscriptionAppStateChange.remove();
    }, [handleAppStateChange]);

    if (!visible || !exchangeRates.length) {
      return null;
    }

    return (
      <HomeSection title={t('Exchange Rates')} label="24H">
        <ExchangeRatesList
          items={exchangeRates}
          defaultAltCurrencyIsoCode={defaultAltCurrency.isoCode}
        />
      </HomeSection>
    );
  },
);

const HomeRoot: React.FC<HomeScreenProps> = ({route, navigation}) => {
  const dispatch = useAppDispatch();
  const {currencyAbbreviation} = route.params || {};
  const theme = useTheme();
  const isHomeFocused = useIsFocused();
  const [refreshing, setRefreshing] = useState(false);
  const hasKeys = useAppSelector(selectHasHomeKeys);
  const appIsLoading = useAppSelector(({APP}) => APP.appIsLoading);
  const defaultAltCurrencyIsoCode = useAppSelector(
    ({APP}) => APP.defaultAltCurrency?.isoCode,
  );
  const portfolioQuoteCurrency = useAppSelector(
    ({PORTFOLIO}) => PORTFOLIO.quoteCurrency,
  );
  const keyMigrationFailure = useAppSelector(
    ({APP}) => APP.keyMigrationFailure,
  );
  const keyMigrationFailureModalHasBeenShown = useAppSelector(
    ({APP}) => APP.keyMigrationFailureModalHasBeenShown,
  );
  const canStartKyc = useAppSelector(SumSubSelectors.selectCanStartKyc);
  const showPinModal = useAppSelector(({APP}) => APP.showPinModal);
  const showBiometricModal = useAppSelector(({APP}) => APP.showBiometricModal);
  const appLocked = showPinModal || showBiometricModal;
  const kycModalShown = useAppSelector(({APP}) => APP.kycGetVerifiedModalShown);
  const quoteCurrency = getQuoteCurrency({
    portfolioQuoteCurrency,
    defaultAltCurrencyIsoCode,
  }).toUpperCase();
  const exchangeRatesReloadRef = useRef<ExchangeRatesReload | undefined>(
    undefined,
  );
  const forceExchangeRatesReloadOnMountRef = useRef(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const reloadExchangeRates = exchangeRatesReloadRef.current;
      if (!reloadExchangeRates) {
        forceExchangeRatesReloadOnMountRef.current = true;
      }

      await Promise.all([
        dispatch(
          refreshRatesForPortfolioPnl({context: 'homeRootOnRefresh'}) as any,
        ),
        reloadExchangeRates?.({force: true}).catch(() => ({})) ??
          Promise.resolve({}),
        dispatch(
          getAndDispatchUpdatedWalletBalances({
            context: 'homeRootOnRefresh',
            createTokenWalletWithFunds: true,
            skipRateUpdate: true,
          }) as any,
        ),
        dispatch(requestBrazeContentRefresh()),
      ]);
      Promise.resolve()
        .then(() =>
          dispatch(
            maybePopulatePortfolioOnAppLaunch({
              quoteCurrency,
              forceRetryQuarantined: true,
            }) as any,
          ),
        )
        .catch(error => {
          logManager.warn(
            `[portfolio] Failed background home refresh populate: ${formatUnknownError(
              error,
            )}`,
          );
        });
    } catch {
      dispatch(showBottomNotificationModal(BalanceUpdateError()));
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, quoteCurrency]);

  const onPressTxpBadge = useCallback(() => {
    navigation
      .getParent<NativeStackNavigationProp<RootStackParamList>>()
      ?.navigate('TransactionProposalNotifications', {});
  }, [navigation]);

  useEffect(() => {
    if (keyMigrationFailure && !keyMigrationFailureModalHasBeenShown) {
      dispatch(setShowKeyMigrationFailureModal(true));
    }
  }, [dispatch, keyMigrationFailure, keyMigrationFailureModalHasBeenShown]);

  // Get Verified modal
  useEffect(() => {
    if (canStartKyc && isHomeFocused && !appLocked && !kycModalShown) {
      const timer = setTimeout(
        () => dispatch(setShowKycGetVerifiedModal(true)),
        1000,
      );
      return () => clearTimeout(timer);
    }
  }, [dispatch, canStartKyc, isHomeFocused, appLocked, kycModalShown]);

  const scrollViewRef = useRef<ScrollView>(null);
  useScrollToTop(scrollViewRef);
  const homeViewportHeightRef = useRef(0);
  const homeScrollOffsetYRef = useRef(0);
  const homeAssetsSectionLayoutRef = useRef<
    {height: number; y: number} | undefined
  >(undefined);
  const homeDiscoverSectionLayoutRef = useRef<
    {height: number; y: number} | undefined
  >(undefined);
  const [shouldActivateHomeAssetsSection, setShouldActivateHomeAssetsSection] =
    useState(false);
  const [
    shouldActivateHomeDiscoverSection,
    setShouldActivateHomeDiscoverSection,
  ] = useState(false);

  const maybeActivateHomeAssetsSection = useCallback(() => {
    if (shouldActivateHomeAssetsSection) {
      return;
    }

    const viewportHeight = homeViewportHeightRef.current;
    const sectionLayout = homeAssetsSectionLayoutRef.current;
    if (!sectionLayout || viewportHeight <= 0 || sectionLayout.height <= 0) {
      return;
    }

    const preloadBottom =
      homeScrollOffsetYRef.current +
      viewportHeight +
      HOME_DEFERRED_PRELOAD_DISTANCE;
    if (sectionLayout.y <= preloadBottom) {
      setShouldActivateHomeAssetsSection(true);
    }
  }, [shouldActivateHomeAssetsSection]);

  const maybeActivateHomeDiscoverSection = useCallback(() => {
    if (shouldActivateHomeDiscoverSection) {
      return;
    }

    const viewportHeight = homeViewportHeightRef.current;
    const sectionLayout = homeDiscoverSectionLayoutRef.current;
    if (!sectionLayout || viewportHeight <= 0 || sectionLayout.height <= 0) {
      return;
    }

    const preloadBottom =
      homeScrollOffsetYRef.current +
      viewportHeight +
      HOME_DEFERRED_PRELOAD_DISTANCE;
    if (sectionLayout.y <= preloadBottom) {
      setShouldActivateHomeDiscoverSection(true);
    }
  }, [shouldActivateHomeDiscoverSection]);

  const onHomeViewportLayout = useCallback(
    (event: LayoutChangeEvent) => {
      homeViewportHeightRef.current = event.nativeEvent.layout.height;
      maybeActivateHomeAssetsSection();
      maybeActivateHomeDiscoverSection();
    },
    [maybeActivateHomeAssetsSection, maybeActivateHomeDiscoverSection],
  );

  const onHomeScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      homeScrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
      if (event.nativeEvent.layoutMeasurement.height > 0) {
        homeViewportHeightRef.current =
          event.nativeEvent.layoutMeasurement.height;
      }
      maybeActivateHomeAssetsSection();
      maybeActivateHomeDiscoverSection();
    },
    [maybeActivateHomeAssetsSection, maybeActivateHomeDiscoverSection],
  );

  const onHomeAssetsSectionLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const {height, y} = event.nativeEvent.layout;
      homeAssetsSectionLayoutRef.current = {height, y};
      maybeActivateHomeAssetsSection();
    },
    [maybeActivateHomeAssetsSection],
  );

  const onHomeDiscoverSectionLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const {height, y} = event.nativeEvent.layout;
      homeDiscoverSectionLayoutRef.current = {height, y};
      maybeActivateHomeDiscoverSection();
    },
    [maybeActivateHomeDiscoverSection],
  );

  const receiveLinkingButton = useMemo(
    () => ({
      cta: () => {
        dispatch(
          Analytics.track('Clicked Receive Crypto', {
            context: 'HomeRoot',
          }),
        );
        dispatch(receiveCrypto(navigation, 'HomeRoot'));
      },
    }),
    [dispatch, navigation],
  );
  const sendLinkingButton = useMemo(
    () => ({
      cta: () => {
        dispatch(
          Analytics.track('Clicked Send Crypto', {
            context: 'HomeRoot',
          }),
        );
        dispatch(sendCrypto('HomeRoot'));
      },
    }),
    [dispatch],
  );

  return (
    <TabContainer>
      {appIsLoading ? null : (
        <>
          <HeaderContainer>
            <HeaderLeftContainer>
              <ScanButton />
            </HeaderLeftContainer>
            <HomePendingTransactionProposalBadge onPress={onPressTxpBadge} />
            <ProfileButton />
          </HeaderContainer>
          <View onLayout={onHomeViewportLayout} style={styles.viewport}>
            <ScrollView
              ref={scrollViewRef}
              onScroll={onHomeScroll}
              scrollEventThrottle={32}
              // Prevent iOS from injecting automatic top insets which creates a gap
              // between the Archax banner and the Home header when the scene is edge-to-edge
              contentInsetAdjustmentBehavior="never"
              refreshControl={
                <RefreshControl
                  tintColor={theme.dark ? White : SlateDark}
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                />
              }>
              {/* ////////////////////////////// KYC NOTIFICATION */}
              <KycBannerGate />

              {/* ////////////////////////////// PORTFOLIO BALANCE */}
              <HomeSection style={{marginTop: 20, marginBottom: 20}}>
                <PerformanceProfiler
                  id="Home:portfolio-balance"
                  onRender={logReactProfiler}>
                  <PortfolioBalance active={isHomeFocused} />
                </PerformanceProfiler>
              </HomeSection>

              {/* ////////////////////////////// CTA BUY SWAP RECEIVE SEND BUTTONS */}
              {hasKeys ? (
                <HomeSection style={{marginBottom: 25}}>
                  <PerformanceProfiler
                    id="Home:linking-buttons"
                    onRender={logReactProfiler}>
                    <LinkingButtons
                      receive={receiveLinkingButton}
                      send={sendLinkingButton}
                    />
                  </PerformanceProfiler>
                </HomeSection>
              ) : null}

              {/* ////////////////////////////// MARKETING */}
              <PerformanceProfiler
                id="Home:marketing"
                onRender={logReactProfiler}>
                <HomeMarketingSection />
              </PerformanceProfiler>

              {/* ////////////////////////////// CRYPTO */}
              <HomeSection>
                <PerformanceProfiler
                  id="Home:crypto"
                  onRender={logReactProfiler}>
                  <Crypto active={isHomeFocused} />
                </PerformanceProfiler>
              </HomeSection>

              {/* ////////////////////////////// SECURE WITH PASSKEY */}
              <SecurePasskeyBannerGate />

              {hasKeys ? (
                <View
                  onLayout={onHomeAssetsSectionLayout}
                  style={
                    shouldActivateHomeAssetsSection
                      ? undefined
                      : styles.portfolioPlaceholder
                  }>
                  {shouldActivateHomeAssetsSection ? (
                    <>
                      <HomeSection>
                        <PerformanceProfiler
                          id="Home:assets"
                          onRender={logReactProfiler}>
                          <HomeAssetsSection active={isHomeFocused} />
                        </PerformanceProfiler>
                      </HomeSection>
                      <PerformanceProfiler
                        id="Home:allocation"
                        onRender={logReactProfiler}>
                        <HomeAllocationSection />
                      </PerformanceProfiler>
                    </>
                  ) : null}
                </View>
              ) : null}

              <View
                onLayout={onHomeDiscoverSectionLayout}
                style={
                  shouldActivateHomeDiscoverSection
                    ? undefined
                    : styles.discoverPlaceholder
                }>
                {shouldActivateHomeDiscoverSection ? (
                  <PerformanceProfiler
                    id="Home:offers"
                    onRender={logReactProfiler}>
                    <HomeOffersSection />
                  </PerformanceProfiler>
                ) : null}
                {shouldActivateHomeDiscoverSection || !!currencyAbbreviation ? (
                  <PerformanceProfiler
                    id="Home:exchange-rates"
                    onRender={logReactProfiler}>
                    <HomeExchangeRatesSection
                      currencyAbbreviation={currencyAbbreviation}
                      navigation={navigation}
                      forceReloadOnMountRef={forceExchangeRatesReloadOnMountRef}
                      reloadRef={exchangeRatesReloadRef}
                      active={isHomeFocused || !!currencyAbbreviation}
                      visible={shouldActivateHomeDiscoverSection}
                    />
                  </PerformanceProfiler>
                ) : null}
                {shouldActivateHomeDiscoverSection ? (
                  <HomeArchaxFooter />
                ) : null}
              </View>
            </ScrollView>
          </View>
        </>
      )}
      <KeyMigrationFailureModal />
      <GetVerifiedModal />
    </TabContainer>
  );
};

export default withErrorFallback(HomeRoot, {includeHeader: true});
