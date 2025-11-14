import {useScrollToTop, useTheme} from '@react-navigation/native';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  AppState,
  AppStateStatus,
  RefreshControl,
  ScrollView,
} from 'react-native';
import {
  EXCHANGE_RATES_SORT_ORDER,
  STATIC_CONTENT_CARDS_ENABLED,
} from '../../../constants/config';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import {
  setShowKeyMigrationFailureModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {requestBrazeContentRefresh} from '../../../store/app/app.effects';
import {
  selectBrazeDoMore,
  selectBrazeMarketingCarousel,
  selectBrazeQuickLinks,
  selectBrazeShopWithCrypto,
} from '../../../store/app/app.selectors';
import {selectCardGroups} from '../../../store/card/card.selectors';
import {getAndDispatchUpdatedWalletBalances} from '../../../store/wallet/effects/status/statusv2';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {SlateDark, White} from '../../../styles/colors';
import {
  calculatePercentageDifference,
  getCurrencyAbbreviation,
  sleep,
} from '../../../utils/helper-methods';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {BalanceUpdateError} from '../../wallet/components/ErrorMessages';
import DefaultAdvertisements from './components/advertisements/DefaultAdvertisements';
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
import DefaultQuickLinks from './components/quick-links/DefaultQuickLinks';
import QuickLinksCarousel from './components/quick-links/QuickLinksCarousel';
import {HeaderContainer, HeaderLeftContainer} from './components/Styled';
import KeyMigrationFailureModal from './components/KeyMigrationFailureModal';
import {useThemeType} from '../../../utils/hooks/useThemeType';
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
import {TabsScreens, TabsStackParamList} from '../TabsStack';
import {
  BitpaySupportedCoins,
  BitpaySupportedTokens,
} from '../../../constants/currencies';
import {Network} from '../../../constants';
import SecurePasskeyBanner from './components/SecurePasskeyBanner';
import DefaultMarketingCards from './components/DefaultMarketingCards';

export type HomeScreenProps = NativeStackScreenProps<
  TabsStackParamList,
  TabsScreens.HOME
>;

const HomeRoot: React.FC<HomeScreenProps> = ({route, navigation}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {currencyAbbreviation} = route.params || {};
  const theme = useTheme();
  const themeType = useThemeType();
  const [refreshing, setRefreshing] = useState(false);
  const brazeDoMore = useAppSelector(selectBrazeDoMore);
  const brazeMarketingCarousel = useAppSelector(selectBrazeMarketingCarousel);
  const brazeShopWithCrypto = useAppSelector(selectBrazeShopWithCrypto);
  const brazeQuickLinks = useAppSelector(selectBrazeQuickLinks);
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const wallets = Object.values(keys).flatMap(k => k.wallets);
  const pendingTxps = wallets.flatMap(w => w.pendingTxps);
  const appIsLoading = useAppSelector(({APP}) => APP.appIsLoading);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const keyMigrationFailure = useAppSelector(
    ({APP}) => APP.keyMigrationFailure,
  );
  const keyMigrationFailureModalHasBeenShown = useAppSelector(
    ({APP}) => APP.keyMigrationFailureModalHasBeenShown,
  );
  const showPortfolioValue = useAppSelector(({APP}) => APP.showPortfolioValue);
  const hasKeys = Object.values(keys).length;
  const cardGroups = useAppSelector(selectCardGroups);
  const hasCards = cardGroups?.length > 0;

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
    if (STATIC_CONTENT_CARDS_ENABLED && !brazeMarketingCarousel.length) {
      return DefaultMarketingCards();
    }

    return brazeMarketingCarousel;
  }, [brazeMarketingCarousel]);

  // Shop with Crypto
  const memoizedShopWithCryptoCards = useMemo(() => {
    const cardsWithCoverImage = brazeShopWithCrypto.filter(
      card => card.extras?.cover_image,
    );

    if (STATIC_CONTENT_CARDS_ENABLED && !cardsWithCoverImage.length) {
      return MockOffers();
    }

    return cardsWithCoverImage;
  }, [brazeShopWithCrypto]);

  // Do More
  const memoizedDoMoreCards = useMemo(() => {
    if (STATIC_CONTENT_CARDS_ENABLED && !brazeDoMore.length) {
      return DefaultAdvertisements(themeType).filter(advertisement => {
        return hasCards ? advertisement.id !== 'card' : true;
      });
    }

    return brazeDoMore;
  }, [brazeDoMore, hasCards, themeType]);

  // Exchange Rates
  const lastDayRates = useAppSelector(({RATE}) => RATE.lastDayRates);
  const rates = useAppSelector(({RATE}) => RATE.rates);
  const memoizedExchangeRates: Array<ExchangeRateItemProps> = useMemo(() => {
    const result = Object.entries(lastDayRates).reduce(
      (ratesList, [key, lastDayRate]) => {
        const lastDayRateForDefaultCurrency = lastDayRate.find(
          ({code}) => code === defaultAltCurrency.isoCode,
        );
        const rateForDefaultCurrency = rates[key].find(
          ({code}) => code === defaultAltCurrency.isoCode,
        );
        const option = SupportedCurrencyOptions.find(
          ({currencyAbbreviation}) => currencyAbbreviation === key,
        );

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
            option &&
            lastDayRateForDefaultCurrency?.rate &&
            rateForDefaultCurrency?.rate &&
            !isStableCoin
          ) {
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
              lastDayRateForDefaultCurrency.rate,
            );

            ratesList.push({
              id,
              img,
              currencyName,
              currencyAbbreviation,
              chain: chain ? chain : currencyAbbreviation,
              tokenAddress: tokenAddress,
              average: percentChange,
              currentPrice: rateForDefaultCurrency.rate,
            });
          }
        }
        return ratesList;
      },
      [] as ExchangeRateItemProps[],
    );

    return result.sort((a, b) => {
      const indexA = EXCHANGE_RATES_SORT_ORDER.indexOf(
        a.currencyAbbreviation.toLowerCase(),
      );
      const indexB = EXCHANGE_RATES_SORT_ORDER.indexOf(
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
  }, [lastDayRates, rates, defaultAltCurrency]);

  // Quick Links
  const memoizedQuickLinks = useMemo(() => {
    if (STATIC_CONTENT_CARDS_ENABLED && !brazeQuickLinks.length) {
      return DefaultQuickLinks();
    }

    return brazeQuickLinks;
  }, [brazeQuickLinks]);

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
          getAndDispatchUpdatedWalletBalances({
            context: 'homeRootOnRefresh',
            createTokenWalletWithFunds: true,
          }),
        ),
        dispatch(requestBrazeContentRefresh()),
        sleep(1000),
      ]);
      await sleep(2000);
    } catch (err) {
      dispatch(showBottomNotificationModal(BalanceUpdateError()));
    }
    setRefreshing(false);
  };

  const onPressTxpBadge = useMemo(
    () => () => {
      navigation.navigate('TransactionProposalNotifications', {});
    },
    [navigation],
  );

  useEffect(() => {
    if (keyMigrationFailure && !keyMigrationFailureModalHasBeenShown) {
      dispatch(setShowKeyMigrationFailureModal(true));
    }
  }, [dispatch, keyMigrationFailure, keyMigrationFailureModalHasBeenShown]);

  const scrollViewRef = useRef<ScrollView>(null);
  useScrollToTop(scrollViewRef);

  useEffect(() => {
    function onAppStateChange(status: AppStateStatus) {
      if (status === 'active' && currencyAbbreviation) {
        navigation.setParams({
          currencyAbbreviation: undefined,
        });
        const exchangeRatesSection = memoizedExchangeRates.find(
          ({currencyAbbreviation: abbr}) =>
            abbr.toLowerCase() === currencyAbbreviation.toLowerCase(),
        );
        if (exchangeRatesSection) {
          navigation.navigate('PriceCharts', {item: exchangeRatesSection});
        }
      }
    }

    const subscriptionAppStateChange = AppState.addEventListener(
      'change',
      onAppStateChange,
    );

    return () => subscriptionAppStateChange.remove();
  }, [currencyAbbreviation]);

  return (
    <TabContainer>
      {appIsLoading ? null : (
        <>
          <HeaderContainer>
            <HeaderLeftContainer>
              <ScanButton />
            </HeaderLeftContainer>
            {pendingTxps.length ? (
              <ProposalBadgeContainer onPress={onPressTxpBadge}>
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
                    cta: () => dispatch(receiveCrypto(navigation, 'HomeRoot')),
                  }}
                  send={{
                    cta: () => dispatch(sendCrypto('HomeRoot')),
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

            {/* ////////////////////////////// SHOP WITH CRYPTO */}
            {memoizedShopWithCryptoCards.length ? (
              <HomeSection
                style={{marginBottom: -10}}
                title={t('Shop with Crypto')}
                action={t('Shop all')}
                onActionPress={() => {
                  navigation.navigate('Tabs', {screen: 'Shop'});
                  dispatch(
                    Analytics.track('Clicked Shop with Crypto', {
                      context: 'HomeRoot',
                    }),
                  );
                }}>
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
