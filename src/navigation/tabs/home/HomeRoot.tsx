import {useNavigation, useTheme} from '@react-navigation/native';
import React, {useEffect, useMemo, useState} from 'react';
import {RefreshControl, ScrollView} from 'react-native';
import {STATIC_CONTENT_CARDS_ENABLED} from '../../../constants/config';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {
  selectBrazeAdvertisements,
  selectBrazeOffers,
  selectBrazeQuickLinks,
} from '../../../store/app/app.selectors';
import {startGetRates} from '../../../store/wallet/effects';
import {startUpdateAllKeyAndWalletStatus} from '../../../store/wallet/effects/status/status';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {SlateDark, White} from '../../../styles/colors';
import {sleep} from '../../../utils/helper-methods';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import OnboardingFinishModal from '../../onboarding/components/OnboardingFinishModal';
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
import {selectCardGroups} from '../../../store/card/card.selectors';
import {HeaderContainer, HomeContainer} from './components/Styled';

const HomeRoot = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const brazeOffers = useAppSelector(selectBrazeOffers);
  const brazeAdvertisements = useAppSelector(selectBrazeAdvertisements);
  const brazeQuickLinks = useAppSelector(selectBrazeQuickLinks);
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const hasKeys = Object.values(keys).length;
  const cardGroups = useAppSelector(selectCardGroups);
  const hasCards = cardGroups.length > 0;

  // Featured Merchants ("Shop with Crypto")
  const memoizedOffers = useMemo(() => {
    if (STATIC_CONTENT_CARDS_ENABLED && !brazeOffers.length) {
      return MockOffers;
    }

    return brazeOffers;
  }, [brazeOffers]);

  // Advertisements ("Do More")
  const memoizedAdvertisements = useMemo(() => {
    const defaults = DefaultAdvertisements.filter(advertisement => {
      if (hasCards) {
        return advertisement.id !== 'card';
      }
      return advertisement;
    });
    return [...defaults, ...brazeAdvertisements];
  }, [brazeAdvertisements, hasCards]);

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
            currentPrice: +history.prices[0].price,
            priceDisplay: history.priceDisplay,
          });
        }

        return ratesList;
      }, [] as ExchangeRateItemProps[]),
    [priceHistory],
  );

  // Quick Links
  const memoizedQuickLinks = useMemo(() => {
    return [...DefaultQuickLinks, ...brazeQuickLinks];
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
      await dispatch(startGetRates());
      await Promise.all([
        dispatch(startUpdateAllKeyAndWalletStatus()),
        sleep(1000),
      ]);
      dispatch(updatePortfolioBalance());
    } catch (err) {
      dispatch(showBottomNotificationModal(BalanceUpdateError));
    }
    setRefreshing(false);
  };

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
                            action: () =>
                              navigation.navigate('BuyCrypto', {
                                screen: 'Root',
                                params: {amount: 50},
                              }),
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
        <HomeSection>
          <Crypto />
        </HomeSection>

        {/* ////////////////////////////// LIMITED TIME OFFERS */}
        {memoizedOffers.length ? (
          <HomeSection
            title="Shop with Crypto"
            action="See all"
            onActionPress={() => navigation.navigate('Tabs', {screen: 'Shop'})}>
            <OffersCarousel contentCards={memoizedOffers} />
          </HomeSection>
        ) : null}

        {/* ////////////////////////////// ADVERTISEMENTS */}
        {memoizedAdvertisements.length ? (
          <HomeSection title="Do More">
            <AdvertisementsList contentCards={memoizedAdvertisements} />
          </HomeSection>
        ) : null}

        {/* ////////////////////////////// EXCHANGE RATES */}
        {memoizedExchangeRates.length ? (
          <HomeSection title="Exchange Rates" slimContainer={true}>
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

      <OnboardingFinishModal />
    </HomeContainer>
  );
};

export default HomeRoot;
