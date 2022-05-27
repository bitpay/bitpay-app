import {useNavigation, useTheme} from '@react-navigation/native';
import React, {useEffect, useMemo, useState} from 'react';
import {RefreshControl, ScrollView} from 'react-native';
import analytics from '@segment/analytics-react-native';
import {STATIC_CONTENT_CARDS_ENABLED} from '../../../constants/config';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import {
  setKeyMigrationFailureModalHasBeenShown,
  setShowKeyMigrationFailureModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {startRefreshBrazeContent} from '../../../store/app/app.effects';
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
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {BalanceUpdateError} from '../../wallet/components/ErrorMessages';
import AdvertisementsList from './components/advertisements/AdvertisementsList';
import DefaultAdvertisements from './components/advertisements/DefaultAdvertisements';
import Crypto, {keyBackupRequired} from './components/Crypto';
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
import {batch} from 'react-redux';

const HomeRoot = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const brazeShopWithCrypto = useAppSelector(selectBrazeShopWithCrypto);
  const brazeDoMore = useAppSelector(selectBrazeDoMore);
  const brazeQuickLinks = useAppSelector(selectBrazeQuickLinks);
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const keyMigrationFailure = useAppSelector(
    ({APP}) => APP.keyMigrationFailure,
  );
  const keyMigrationFailureModalHasBeenShown = useAppSelector(
    ({APP}) => APP.keyMigrationFailureModalHasBeenShown,
  );
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const hasKeys = Object.values(keys).length;
  const cardGroups = useAppSelector(selectCardGroups);
  const hasCards = cardGroups.length > 0;

  // Shop with Crypto
  const memoizedShopWithCryptoCards = useMemo(() => {
    if (STATIC_CONTENT_CARDS_ENABLED && !brazeShopWithCrypto.length) {
      return MockOffers;
    }

    return brazeShopWithCrypto;
  }, [brazeShopWithCrypto]);

  // Do More
  const memoizedDoMoreCards = useMemo(() => {
    if (STATIC_CONTENT_CARDS_ENABLED && !brazeDoMore.length) {
      return DefaultAdvertisements.filter(advertisement => {
        return hasCards ? advertisement.id !== 'card' : true;
      });
    }

    return brazeDoMore;
  }, [brazeDoMore, hasCards]);

  // Exchange Rates
  const priceHistory = useAppSelector(({WALLET}) => WALLET.priceHistory);
  const memoizedExchangeRates: Array<ExchangeRateItemProps> = useMemo(
    () =>
      priceHistory.reduce((ratesList, history) => {
        const option = SupportedCurrencyOptions.find(
          ({id}) => id === history.coin,
        );

        if (option) {
          const {id, img, currencyName, currencyAbbreviation} = option;

          ratesList.push({
            id,
            img,
            currencyName,
            currencyAbbreviation,
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
      return DefaultQuickLinks;
    }

    return brazeQuickLinks;
  }, [brazeQuickLinks]);

  const showPortfolioValue = useAppSelector(({APP}) => APP.showPortfolioValue);

  useEffect(() => {
    return navigation.addListener('focus', () => {
      dispatch(updatePortfolioBalance());
    });
  }, [dispatch, navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      dispatch(getPriceHistory(defaultAltCurrency.isoCode));
      await dispatch(startGetRates({force: true}));
      await Promise.all([
        dispatch(startUpdateAllKeyAndWalletStatus()),
        dispatch(startRefreshBrazeContent()),
        sleep(1000),
      ]);
      dispatch(updatePortfolioBalance());
    } catch (err) {
      dispatch(showBottomNotificationModal(BalanceUpdateError));
    }
    setRefreshing(false);
  };

  useEffect(() => {
    if (keyMigrationFailure && !keyMigrationFailureModalHasBeenShown) {
      batch(() => {
        dispatch(setShowKeyMigrationFailureModal(true));
        dispatch(setKeyMigrationFailureModalHasBeenShown());
      });
    }
  }, [dispatch, keyMigrationFailure, keyMigrationFailureModalHasBeenShown]);

  return (
    <HomeContainer>
      <ScrollView
        refreshControl={
          <RefreshControl
            tintColor={theme.dark ? White : SlateDark}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }>
        <HeaderContainer>
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
                cta: () => {
                  const needsBackup = !Object.values(keys).filter(
                    key => key.backupComplete,
                  ).length;
                  if (needsBackup) {
                    dispatch(
                      showBottomNotificationModal(
                        keyBackupRequired(Object.values(keys)[0], navigation),
                      ),
                    );
                  } else {
                    navigation.navigate('Wallet', {
                      screen: 'GlobalSelect',
                      params: {context: 'receive'},
                    });
                  }
                },
              }}
              send={{
                cta: () => {
                  const walletsWithBalance = Object.values(keys)
                    .filter(key => key.backupComplete)
                    .flatMap(key => key.wallets)
                    .filter(wallet => !wallet.hideWallet && wallet.isComplete())
                    .filter(wallet => wallet.balance.sat > 0);

                  if (!walletsWithBalance.length) {
                    dispatch(
                      showBottomNotificationModal({
                        type: 'warning',
                        title: 'No funds available',
                        message: 'You do not have any funds to send.',
                        enableBackdropDismiss: true,
                        actions: [
                          {
                            text: 'Add funds',
                            action: () => {
                              analytics.track(
                                'BitPay App - Clicked Buy Crypto',
                                {
                                  from: 'HomeRoot',
                                  appUser: user?.eid || '',
                                },
                              );
                              navigation.navigate('Wallet', {
                                screen: 'Amount',
                                params: {
                                  onAmountSelected: (amount: string) => {
                                    navigation.navigate('BuyCrypto', {
                                      screen: 'BuyCryptoRoot',
                                      params: {
                                        amount: Number(amount),
                                      },
                                    });
                                  },
                                  opts: {
                                    hideSendMax: true,
                                  },
                                },
                              });
                            },
                            primary: true,
                          },
                          {
                            text: 'Got It',
                            action: () => null,
                            primary: false,
                          },
                        ],
                      }),
                    );
                  } else {
                    navigation.navigate('Wallet', {
                      screen: 'GlobalSelect',
                      params: {context: 'send'},
                    });
                  }
                },
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
            title="Shop with Crypto"
            action="See all"
            onActionPress={() => navigation.navigate('Tabs', {screen: 'Shop'})}>
            <OffersCarousel contentCards={memoizedShopWithCryptoCards} />
          </HomeSection>
        ) : null}

        {/* ////////////////////////////// DO MORE */}
        {memoizedDoMoreCards.length ? (
          <HomeSection title="Do More">
            <AdvertisementsList contentCards={memoizedDoMoreCards} />
          </HomeSection>
        ) : null}

        {/* ////////////////////////////// EXCHANGE RATES */}
        {memoizedExchangeRates.length ? (
          <HomeSection title="Exchange Rates" label="1D">
            <ExchangeRatesList
              items={memoizedExchangeRates}
              defaultAltCurrencyIsoCode={defaultAltCurrency.isoCode}
            />
          </HomeSection>
        ) : null}

        {/* ////////////////////////////// QUICK LINKS - Leave feedback etc */}
        {memoizedQuickLinks.length ? (
          <HomeSection title="Quick Links">
            <QuickLinksCarousel contentCards={memoizedQuickLinks} />
          </HomeSection>
        ) : null}
      </ScrollView>
      <KeyMigrationFailureModal />
    </HomeContainer>
  );
};

export default HomeRoot;
