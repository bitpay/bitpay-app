import {useScrollToTop, useTheme} from '@react-navigation/native';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  AppState,
  AppStateStatus,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import {
  EXCHANGE_RATES_CURRENCIES,
  STATIC_CONTENT_CARDS_ENABLED,
} from '../../../constants/config';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import {
  setShowKeyMigrationFailureModal,
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
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {SlateDark, White} from '../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import useRuntimeFiatRateSeriesCache from '../../../portfolio/ui/hooks/useRuntimeFiatRateSeriesCache';
import {BalanceUpdateError} from '../../wallet/components/ErrorMessages';
import Crypto from './components/Crypto';
import ExchangeRatesList, {
  ExchangeRateItemProps,
} from './components/exchange-rates/ExchangeRatesList';
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

export type HomeScreenProps = NativeStackScreenProps<
  TabsStackParamList,
  TabsScreens.HOME
>;

const HomeRoot: React.FC<HomeScreenProps> = ({route, navigation}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {currencyAbbreviation} = route.params || {};
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const brazeMarketingCarousel = useAppSelector(selectBrazeMarketingCarousel);
  const brazeShopWithCrypto = useAppSelector(selectBrazeShopWithCrypto);
  const keys = useAppSelector(({WALLET}) => WALLET.keys) as Record<string, Key>;
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);
  const wallets = (Object.values(keys) as Key[]).flatMap((k: Key) => k.wallets);
  const pendingTxps = wallets.flatMap(w => w.pendingTxps);
  const appIsLoading = useAppSelector(({APP}) => APP.appIsLoading);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const portfolio = useAppSelector(({PORTFOLIO}) => PORTFOLIO);
  const rates = useAppSelector(({RATE}) => RATE.rates) as Rates;
  const keyMigrationFailure = useAppSelector(
    ({APP}) => APP.keyMigrationFailure,
  );
  const keyMigrationFailureModalHasBeenShown = useAppSelector(
    ({APP}) => APP.keyMigrationFailureModalHasBeenShown,
  );
  const showPortfolioValue = useAppSelector(selectShowPortfolioValue);
  const hasKeys = Object.values(keys).length;

  const portfolioAllocationTotalFiat = useMemo(() => {
    return getPortfolioAllocationTotalFiat({
      keys,
      homeCarouselConfig,
    });
  }, [homeCarouselConfig, keys]);

  const visibleWallets = useMemo(
    () => getVisibleWalletsFromKeys(keys, homeCarouselConfig),
    [homeCarouselConfig, keys],
  );

  const hasAnyVisibleWalletBalance = useMemo(() => {
    return walletsHaveNonZeroLiveBalance(visibleWallets);
  }, [visibleWallets]);

  const showPortfolioAllocationSection =
    portfolioAllocationTotalFiat > 0 || hasAnyVisibleWalletBalance;

  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);

  const memoizedMarketingCards = useMemo(() => {
    const cards =
      STATIC_CONTENT_CARDS_ENABLED && !brazeMarketingCarousel.length
        ? DefaultMarketingCards()
        : brazeMarketingCarousel;

    return [...cards].sort(sortNewestFirst);
  }, [brazeMarketingCarousel]);

  // Do More
  const memoizedShopWithCryptoCards = useMemo(() => {
    const cardsWithCoverImage = brazeShopWithCrypto.filter(
      card => card.extras?.cover_image,
    );

    const cards =
      STATIC_CONTENT_CARDS_ENABLED && !cardsWithCoverImage.length
        ? MockOffers()
        : cardsWithCoverImage;

    return [...cards].sort(sortNewestFirst);
  }, [brazeShopWithCrypto]);

  // Exchange Rates
  const lastDayRates = useAppSelector(({RATE}) => RATE.lastDayRates) as Rates;
  const quoteCurrency = getQuoteCurrency({
    portfolioQuoteCurrency: portfolio.quoteCurrency,
    defaultAltCurrencyIsoCode: defaultAltCurrency?.isoCode,
  }).toUpperCase();
  const exchangeRateHistoricalRequests = useMemo(
    () =>
      EXCHANGE_RATES_CURRENCIES.map(coin => ({
        coin,
        intervals: ['1D'],
      })),
    [],
  );
  const {cache: fiatRateSeriesCache, reload: reloadFiatRateSeriesCache} =
    useRuntimeFiatRateSeriesCache({
      quoteCurrency,
      requests: exchangeRateHistoricalRequests,
      maxAgeMs: HISTORIC_RATES_CACHE_DURATION * 1000,
      enabled: true,
    });
  const memoizedExchangeRates: Array<ExchangeRateItemProps> = useMemo(() => {
    return buildHomeExchangeRateItems({
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
    });
  }, [fiatRateSeriesCache, lastDayRates, quoteCurrency, rates]);

  useEffect(() => {
    return navigation.addListener('focus', () => {
      if (!appIsLoading) {
        dispatch(updatePortfolioBalance());
      } // portfolio balance is updated in app init

      // Detail screens can refresh the shared runtime fiat-series storage while
      // Home stays mounted in the background. Reload on focus so the exchange
      // rate list picks up the latest shared series without requiring a manual
      // pull-to-refresh on Home.
      reloadFiatRateSeriesCache().catch(() => undefined);
    });
  }, [appIsLoading, dispatch, navigation, reloadFiatRateSeriesCache]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(
          refreshRatesForPortfolioPnl({context: 'homeRootOnRefresh'}) as any,
        ),
        reloadFiatRateSeriesCache({force: true}).catch(() => ({})),
        dispatch(
          getAndDispatchUpdatedWalletBalances({
            context: 'homeRootOnRefresh',
            createTokenWalletWithFunds: true,
            skipRateUpdate: true,
          }) as any,
        ),
        dispatch(requestBrazeContentRefresh()),
      ]);
      await dispatch(
        maybePopulatePortfolioOnAppLaunch({
          quoteCurrency,
        }) as any,
      );
    } catch {
      dispatch(showBottomNotificationModal(BalanceUpdateError()));
    } finally {
      setRefreshing(false);
    }
  };

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

  const scrollViewRef = useRef<ScrollView>(null);
  useScrollToTop(scrollViewRef);
  const homeViewportRef = useRef<View>(null);
  const homeAssetsSectionRef = useRef<View>(null);
  const homeAssetsSectionVisibilityCheckInFlightRef = useRef(false);
  const [shouldActivateHomeAssetsSection, setShouldActivateHomeAssetsSection] =
    useState(false);

  const exchangeRatesRef = useRef(memoizedExchangeRates);
  useEffect(() => {
    exchangeRatesRef.current = memoizedExchangeRates;
  }, [memoizedExchangeRates]);

  const maybeActivateHomeAssetsSection = useCallback(() => {
    if (shouldActivateHomeAssetsSection) {
      return;
    }

    const homeViewport = homeViewportRef.current;
    const homeAssetsSection = homeAssetsSectionRef.current;
    if (
      homeAssetsSectionVisibilityCheckInFlightRef.current ||
      !homeViewport?.measureInWindow ||
      !homeAssetsSection?.measureInWindow
    ) {
      return;
    }

    homeAssetsSectionVisibilityCheckInFlightRef.current = true;

    homeViewport.measureInWindow(
      (_viewportX, viewportY, _viewportWidth, viewportHeight) => {
        homeAssetsSection.measureInWindow(
          (_sectionX, sectionY, _sectionWidth, sectionHeight) => {
            homeAssetsSectionVisibilityCheckInFlightRef.current = false;

            const viewportBottom = viewportY + viewportHeight;
            const sectionBottom = sectionY + sectionHeight;
            const isVisible =
              viewportHeight > 0 &&
              sectionHeight > 0 &&
              sectionBottom >= viewportY &&
              sectionY <= viewportBottom;

            if (isVisible) {
              setShouldActivateHomeAssetsSection(true);
            }
          },
        );
      },
    );
  }, [shouldActivateHomeAssetsSection]);

  const onHomeViewportLayout = useCallback(() => {
    maybeActivateHomeAssetsSection();
  }, [maybeActivateHomeAssetsSection]);

  const onHomeScroll = useCallback(() => {
    maybeActivateHomeAssetsSection();
  }, [maybeActivateHomeAssetsSection]);

  const onHomeAssetsSectionLayout = useCallback(() => {
    maybeActivateHomeAssetsSection();
  }, [maybeActivateHomeAssetsSection]);

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

  return (
    <TabContainer>
      {appIsLoading ? null : (
        <>
          <HeaderContainer>
            <HeaderLeftContainer>
              <ScanButton />
            </HeaderLeftContainer>
            {pendingTxps.length ? (
              <ProposalBadgeContainer
                onPress={onPressTxpBadge}
                style={{marginRight: 8}}>
                <ProposalBadge>{pendingTxps.length}</ProposalBadge>
              </ProposalBadgeContainer>
            ) : null}
            <ProfileButton />
          </HeaderContainer>
          <View
            ref={homeViewportRef}
            onLayout={onHomeViewportLayout}
            style={{flex: 1}}>
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
              {/* ////////////////////////////// PORTFOLIO BALANCE */}
              {showPortfolioValue ? (
                <HomeSection style={{marginTop: 20, marginBottom: 20}}>
                  <PortfolioBalance />
                </HomeSection>
              ) : null}

              {/* ////////////////////////////// CTA BUY SWAP RECEIVE SEND BUTTONS */}
              {hasKeys && showPortfolioValue ? (
                <HomeSection style={{marginBottom: 25}}>
                  <LinkingButtons
                    receive={{
                      cta: () => {
                        dispatch(
                          Analytics.track('Clicked Receive Crypto', {
                            context: 'HomeRoot',
                          }),
                        );
                        dispatch(receiveCrypto(navigation, 'HomeRoot'));
                      },
                    }}
                    send={{
                      cta: () => {
                        dispatch(
                          Analytics.track('Clicked Send Crypto', {
                            context: 'HomeRoot',
                          }),
                        );
                        dispatch(sendCrypto('HomeRoot'));
                      },
                    }}
                  />
                </HomeSection>
              ) : null}

              {/* ////////////////////////////// MARKETING */}
              {memoizedMarketingCards.length ? (
                <HomeSection>
                  <MarketingCarousel contentCards={memoizedMarketingCards} />
                </HomeSection>
              ) : null}

              {/* ////////////////////////////// CRYPTO */}
              <HomeSection>
                <Crypto />
              </HomeSection>

              {/* ////////////////////////////// SECURE WITH PASSKEY */}
              <SecurePasskeyBannerGate />

              {showPortfolioValue ? (
                <HomeSection>
                  <View
                    ref={homeAssetsSectionRef}
                    onLayout={onHomeAssetsSectionLayout}>
                    <AssetsSection enabled={shouldActivateHomeAssetsSection} />
                  </View>
                </HomeSection>
              ) : null}

              {showPortfolioValue && showPortfolioAllocationSection ? (
                <HomeSection>
                  <AllocationSection />
                </HomeSection>
              ) : null}

              {/* ////////////////////////////// DO MORE */}
              {memoizedShopWithCryptoCards.length ? (
                <HomeSection
                  style={{marginBottom: 20}}
                  title={t('Do More')}
                  // action={t('Shop all')}
                  // onActionPress={() => {
                  //   (navigation as any).navigate('Tabs', {screen: 'Shop'});
                  //   dispatch(
                  //     Analytics.track('Clicked Shop with Crypto', {
                  //       context: 'HomeRoot',
                  //     }),
                  //   );
                  // }}
                >
                  <OffersCarousel contentCards={memoizedShopWithCryptoCards} />
                </HomeSection>
              ) : null}

              {/* ////////////////////////////// EXCHANGE RATES */}
              {memoizedExchangeRates.length ? (
                <HomeSection title={t('Exchange Rates')} label="24H">
                  <ExchangeRatesList
                    items={memoizedExchangeRates}
                    defaultAltCurrencyIsoCode={defaultAltCurrency.isoCode}
                  />
                </HomeSection>
              ) : null}

              {showArchaxBanner && <ArchaxFooter />}
            </ScrollView>
          </View>
        </>
      )}
      <KeyMigrationFailureModal />
    </TabContainer>
  );
};

export default withErrorFallback(HomeRoot, {includeHeader: true});
