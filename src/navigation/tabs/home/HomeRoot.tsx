import {useScrollToTop, useTheme} from '@react-navigation/native';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  AppState,
  AppStateStatus,
  RefreshControl,
  ScrollView,
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
import {getAndDispatchUpdatedWalletBalances} from '../../../store/wallet/effects/status/statusv2';
import {
  fetchFiatRateSeriesInterval,
  refreshRatesForPortfolioPnl,
} from '../../../store/wallet/effects';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {SlateDark, White} from '../../../styles/colors';
import {
  calculatePercentageDifference,
  getCurrencyAbbreviation,
  getLastDayTimestampStartOfHourMs,
} from '../../../utils/helper-methods';
import {getFiatRateFromSeriesCacheAtTimestamp} from '../../../utils/portfolio/rate';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
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
import {maybePopulatePortfolioForWallets} from '../../../store/portfolio';
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
import {Network} from '../../../constants';
import SecurePasskeyBanner from './components/SecurePasskeyBanner';
import DefaultMarketingCards from './components/DefaultMarketingCards';
import AllocationSection from './components/AllocationSection';
import AssetsSection from './components/AssetsSection';
import {getPortfolioAllocationTotalFiat} from '../../../utils/portfolio/allocation';
import type {Key} from '../../../store/wallet/wallet.models';
import type {Rate, Rates} from '../../../store/rate/rate.models';
import {getCoinAndChainFromCurrencyCode} from '../../bitpay-id/utils/bitpay-id-utils';
import {
  findSupportedCurrencyOptionForAsset,
  getQuoteCurrency,
  getVisibleWalletsFromKeys,
  walletHasNonZeroLiveBalance,
} from '../../../utils/portfolio/assets';
import {sortNewestFirst} from '../../../utils/braze';

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
  const fiatRateSeriesCache = useAppSelector(
    ({RATE}) => RATE.fiatRateSeriesCache,
  );
  const keyMigrationFailure = useAppSelector(
    ({APP}) => APP.keyMigrationFailure,
  );
  const keyMigrationFailureModalHasBeenShown = useAppSelector(
    ({APP}) => APP.keyMigrationFailureModalHasBeenShown,
  );
  const showPortfolioValue = useAppSelector(({APP}) => APP.showPortfolioValue);
  const hasKeys = Object.values(keys).length;

  const portfolioAllocationTotalFiat = useMemo(() => {
    return getPortfolioAllocationTotalFiat({
      keys,
      homeCarouselConfig,
    });
  }, [homeCarouselConfig, keys]);

  const hasAnyVisibleWalletBalance = useMemo(() => {
    const visibleWallets = getVisibleWalletsFromKeys(keys, homeCarouselConfig);

    return visibleWallets.some(walletHasNonZeroLiveBalance);
  }, [homeCarouselConfig, keys]);

  const showPortfolioAllocationSection =
    portfolioAllocationTotalFiat > 0 || hasAnyVisibleWalletBalance;

  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const network: Network = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const passkeyCredentials = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.passkeyCredentials,
  );
  const [showSecureAccountBanner, setShowSecureAccountBanner] = useState(false);

  // Check if user has passkey
  useEffect(() => {
    if (!user) {
      setShowSecureAccountBanner(false);
    } else if (
      (passkeyCredentials && passkeyCredentials.length > 0) ||
      !user?.verified
    ) {
      setShowSecureAccountBanner(false);
    } else {
      setShowSecureAccountBanner(true);
    }
  }, [passkeyCredentials, user]);

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
  const memoizedExchangeRates: Array<ExchangeRateItemProps> = useMemo(() => {
    const baselineTimestampMs = getLastDayTimestampStartOfHourMs();
    const result = (
      Object.entries(lastDayRates) as Array<[string, Rate[]]>
    ).reduce((ratesList, [key, lastDayRate]) => {
      const lastDayRateForDefaultCurrency = lastDayRate.find(
        ({code}: {code: string}) => code === quoteCurrency,
      );
      const rateForDefaultCurrency = rates[key].find(
        ({code}: {code: string}) => code === quoteCurrency,
      );
      const {coin: targetCoin, chain: targetChain} =
        getCoinAndChainFromCurrencyCode(key);
      const option = findSupportedCurrencyOptionForAsset({
        options: SupportedCurrencyOptions,
        currencyAbbreviation: targetCoin,
        chain: targetChain,
      });

      if (option && option.chain && option.currencyAbbreviation) {
        const currencyName = getCurrencyAbbreviation(
          option?.tokenAddress
            ? option?.tokenAddress
            : option?.currencyAbbreviation,
          option?.chain,
        );
        const isStableCoin =
          BitpaySupportedCoins[currencyName]?.properties?.isStableCoin ||
          BitpaySupportedTokens[currencyName]?.properties?.isStableCoin;

        if (
          rateForDefaultCurrency?.rate &&
          !isStableCoin &&
          EXCHANGE_RATES_CURRENCIES.includes(
            option.currencyAbbreviation.toLowerCase(),
          )
        ) {
          const prevRateFromSeries = getFiatRateFromSeriesCacheAtTimestamp({
            fiatRateSeriesCache,
            fiatCode: quoteCurrency,
            currencyAbbreviation: option.currencyAbbreviation,
            interval: '1D',
            timestampMs: baselineTimestampMs,
            method: 'linear',
          });
          const prevRate =
            prevRateFromSeries ?? lastDayRateForDefaultCurrency?.rate;

          if (!(prevRate && prevRate > 0)) {
            return ratesList;
          }

          const {
            id,
            img,
            currencyName,
            currencyAbbreviation,
            chain,
            tokenAddress,
          } = option;

          const percentChange = calculatePercentageDifference(
            rateForDefaultCurrency.rate,
            prevRate,
          );

          ratesList.push({
            id,
            img,
            currencyName,
            currencyAbbreviation,
            chain,
            tokenAddress: tokenAddress,
            average: percentChange,
            currentPrice: rateForDefaultCurrency.rate,
          });
        }
      }
      return ratesList;
    }, [] as ExchangeRateItemProps[]);

    return result.sort((a, b) => {
      const indexA = EXCHANGE_RATES_CURRENCIES.indexOf(
        a.currencyAbbreviation.toLowerCase(),
      );
      const indexB = EXCHANGE_RATES_CURRENCIES.indexOf(
        b.currencyAbbreviation.toLowerCase(),
      );

      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      if (indexA !== -1) {
        return -1;
      }
      if (indexB !== -1) {
        return 1;
      }
      return a.currencyName.localeCompare(b.currencyName);
    });
  }, [fiatRateSeriesCache, lastDayRates, quoteCurrency, rates]);

  useEffect(() => {
    return navigation.addListener('focus', () => {
      if (!appIsLoading) {
        dispatch(updatePortfolioBalance());
      } // portfolio balance is updated in app init
    });
  }, [dispatch, navigation, appIsLoading]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(
          refreshRatesForPortfolioPnl({context: 'homeRootOnRefresh'}) as any,
        ),
        dispatch(
          fetchFiatRateSeriesInterval({
            fiatCode: quoteCurrency,
            interval: '1D',
            coinForCacheCheck: 'btc',
            force: true,
          }) as any,
        ),
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
        maybePopulatePortfolioForWallets({
          wallets,
          quoteCurrency,
        }) as any,
      );
    } catch (err) {
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

  const exchangeRatesRef = useRef(memoizedExchangeRates);
  useEffect(() => {
    exchangeRatesRef.current = memoizedExchangeRates;
  }, [memoizedExchangeRates]);

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
          <ScrollView
            ref={scrollViewRef}
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
              <HomeSection style={{marginTop: 5, marginBottom: 20}}>
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
            {showSecureAccountBanner ? (
              <HomeSection>
                <SecurePasskeyBanner />
              </HomeSection>
            ) : null}

            {showPortfolioValue ? (
              <HomeSection>
                <AssetsSection />
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
            {!showArchaxBanner && memoizedExchangeRates.length ? (
              <HomeSection title={t('Exchange Rates')} label="24H">
                <ExchangeRatesList
                  items={memoizedExchangeRates}
                  defaultAltCurrencyIsoCode={defaultAltCurrency.isoCode}
                />
              </HomeSection>
            ) : null}

            {showArchaxBanner && <ArchaxFooter />}
          </ScrollView>
        </>
      )}
      <KeyMigrationFailureModal />
    </TabContainer>
  );
};

export default withErrorFallback(HomeRoot, {includeHeader: true});
