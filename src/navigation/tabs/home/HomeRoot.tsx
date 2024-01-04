import {
  useNavigation,
  useScrollToTop,
  useTheme,
} from '@react-navigation/native';
import {each} from 'lodash';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {RefreshControl, ScrollView} from 'react-native';
import {STATIC_CONTENT_CARDS_ENABLED} from '../../../constants/config';
import {SupportedCoinsOptions} from '../../../constants/SupportedCurrencyOptions';
import {
  setShowKeyMigrationFailureModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {requestBrazeContentRefresh} from '../../../store/app/app.effects';
import {
  selectBrazeDoMore,
  selectBrazeQuickLinks,
  selectBrazeShopWithCrypto,
} from '../../../store/app/app.selectors';
import {selectCardGroups} from '../../../store/card/card.selectors';
import {getPriceHistory, startGetRates} from '../../../store/wallet/effects';
import {startUpdateAllKeyAndWalletStatus} from '../../../store/wallet/effects/status/status';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {SlateDark, White} from '../../../styles/colors';
import {sleep} from '../../../utils/helper-methods';
import {
  useAppDispatch,
  useAppSelector,
  useBrazeRefreshOnFocus,
} from '../../../utils/hooks';
import {BalanceUpdateError} from '../../wallet/components/ErrorMessages';
import AdvertisementsList from './components/advertisements/AdvertisementsList';
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
import PortfolioBalance from './components/PortfolioBalance';
import DefaultQuickLinks from './components/quick-links/DefaultQuickLinks';
import QuickLinksCarousel from './components/quick-links/QuickLinksCarousel';
import {HeaderContainer, HomeContainer} from './components/Styled';
import KeyMigrationFailureModal from './components/KeyMigrationFailureModal';
import {useThemeType} from '../../../utils/hooks/useThemeType';
import {ProposalBadgeContainer} from '../../../components/styled/Containers';
import {ProposalBadge} from '../../../components/styled/Text';
import {
  receiveCrypto,
  sendCrypto,
} from '../../../store/wallet/effects/send/send';
import {Analytics} from '../../../store/analytics/analytics.effects';

const HomeRoot = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const theme = useTheme();
  const themeType = useThemeType();
  const [refreshing, setRefreshing] = useState(false);
  const brazeShopWithCrypto = useAppSelector(selectBrazeShopWithCrypto);
  const brazeDoMore = useAppSelector(selectBrazeDoMore);
  const brazeQuickLinks = useAppSelector(selectBrazeQuickLinks);
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const wallets = Object.values(keys).flatMap(k => k.wallets);
  let pendingTxps: any = [];
  each(wallets, x => {
    if (x.pendingTxps) {
      pendingTxps = pendingTxps.concat(x.pendingTxps);
    }
  });
  const appIsLoading = useAppSelector(({APP}) => APP.appIsLoading);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const defaultLanguage = useAppSelector(({APP}) => APP.defaultLanguage);
  const keyMigrationFailure = useAppSelector(
    ({APP}) => APP.keyMigrationFailure,
  );
  const keyMigrationFailureModalHasBeenShown = useAppSelector(
    ({APP}) => APP.keyMigrationFailureModalHasBeenShown,
  );
  const showPortfolioValue = useAppSelector(({APP}) => APP.showPortfolioValue);
  const hasKeys = Object.values(keys).length;
  const cardGroups = useAppSelector(selectCardGroups);
  const hasCards = cardGroups.length > 0;
  useBrazeRefreshOnFocus();

  // Shop with Crypto
  const memoizedShopWithCryptoCards = useMemo(() => {
    if (STATIC_CONTENT_CARDS_ENABLED && !brazeShopWithCrypto.length) {
      return MockOffers();
    }

    return brazeShopWithCrypto;
  }, [brazeShopWithCrypto, defaultLanguage]);

  // Do More
  const memoizedDoMoreCards = useMemo(() => {
    if (STATIC_CONTENT_CARDS_ENABLED && !brazeDoMore.length) {
      return DefaultAdvertisements(themeType).filter(advertisement => {
        return hasCards ? advertisement.id !== 'card' : true;
      });
    }

    return brazeDoMore;
  }, [brazeDoMore, hasCards, themeType, defaultLanguage]);

  // Exchange Rates
  const priceHistory = useAppSelector(({RATE}) => RATE.priceHistory);
  const memoizedExchangeRates: Array<ExchangeRateItemProps> = useMemo(
    () =>
      priceHistory.reduce((ratesList, history) => {
        const option = SupportedCoinsOptions.find(
          ({currencyAbbreviation}) => currencyAbbreviation === history.coin,
        );

        if (option) {
          const {id, img, currencyName, currencyAbbreviation} = option;

          ratesList.push({
            id,
            img,
            currencyName,
            currencyAbbreviation,
            chain: currencyAbbreviation.toLowerCase(), // currencyAbbreviation same as chain for rates coins
            average: +history.percentChange,
            currentPrice: +history.prices[history.prices.length - 1].price,
            priceDisplay: history.priceDisplay,
          });
        }

        return ratesList;
      }, [] as ExchangeRateItemProps[]),
    [priceHistory],
  );

  // Quick Links
  const memoizedQuickLinks = useMemo(() => {
    if (STATIC_CONTENT_CARDS_ENABLED && !brazeQuickLinks.length) {
      return DefaultQuickLinks();
    }

    return brazeQuickLinks;
  }, [brazeQuickLinks, defaultLanguage]);

  useEffect(() => {
    return navigation.addListener('focus', () => {
      if (!appIsLoading) {
        dispatch(updatePortfolioBalance());
      } // portfolio balance is updated in app init
    });
  }, [dispatch, navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      dispatch(getPriceHistory(defaultAltCurrency.isoCode));
      await dispatch(startGetRates({force: true}));
      await Promise.all([
        dispatch(startUpdateAllKeyAndWalletStatus({force: true})),
        dispatch(requestBrazeContentRefresh()),
        sleep(1000),
      ]);
      dispatch(updatePortfolioBalance());
    } catch (err) {
      dispatch(showBottomNotificationModal(BalanceUpdateError()));
    }
    setRefreshing(false);
  };

  const onPressTxpBadge = useMemo(
    () => () => {
      navigation.navigate('TransactionProposalNotifications', {});
    },
    [],
  );

  useEffect(() => {
    if (keyMigrationFailure && !keyMigrationFailureModalHasBeenShown) {
      dispatch(setShowKeyMigrationFailureModal(true));
    }
  }, [dispatch, keyMigrationFailure, keyMigrationFailureModalHasBeenShown]);

  const scrollViewRef = useRef<ScrollView>(null);
  useScrollToTop(scrollViewRef);

  return (
    <HomeContainer>
      {appIsLoading ? null : (
        <ScrollView
          ref={scrollViewRef}
          refreshControl={
            <RefreshControl
              tintColor={theme.dark ? White : SlateDark}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }>
          <HeaderContainer>
            {pendingTxps.length ? (
              <ProposalBadgeContainer onPress={onPressTxpBadge}>
                <ProposalBadge>{pendingTxps.length}</ProposalBadge>
              </ProposalBadgeContainer>
            ) : null}
            <ScanButton />
            <ProfileButton />
          </HeaderContainer>

          {/* ////////////////////////////// PORTFOLIO BALANCE */}
          {showPortfolioValue ? (
            <HomeSection style={{marginTop: 5}} slimContainer={true}>
              <PortfolioBalance />
            </HomeSection>
          ) : null}

          {/* ////////////////////////////// CTA BUY SWAP RECEIVE SEND BUTTONS */}
          {hasKeys ? (
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

          {/* ////////////////////////////// CRYPTO */}
          <HomeSection slimContainer={true}>
            <Crypto />
          </HomeSection>

          {/* ////////////////////////////// SHOP WITH CRYPTO */}
          {memoizedShopWithCryptoCards.length ? (
            <HomeSection
              title={t('Shop with Crypto')}
              action={t('See all')}
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

          {/* ////////////////////////////// DO MORE */}
          {memoizedDoMoreCards.length ? (
            <HomeSection title={t('Do More')}>
              <AdvertisementsList contentCards={memoizedDoMoreCards} />
            </HomeSection>
          ) : null}

          {/* ////////////////////////////// EXCHANGE RATES */}
          {memoizedExchangeRates.length ? (
            <HomeSection title={t('Exchange Rates')} label="1D">
              <ExchangeRatesList
                items={memoizedExchangeRates}
                defaultAltCurrencyIsoCode={defaultAltCurrency.isoCode}
              />
            </HomeSection>
          ) : null}

          {/* ////////////////////////////// QUICK LINKS - Leave feedback etc */}
          {memoizedQuickLinks.length ? (
            <HomeSection title={t('Quick Links')}>
              <QuickLinksCarousel contentCards={memoizedQuickLinks} />
            </HomeSection>
          ) : null}
        </ScrollView>
      )}
      <KeyMigrationFailureModal />
    </HomeContainer>
  );
};

export default HomeRoot;
