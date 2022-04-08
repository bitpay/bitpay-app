import {useNavigation, useTheme} from '@react-navigation/native';
import React, {useEffect, useMemo, useState} from 'react';
import {RefreshControl, ScrollView} from 'react-native';
import {ExchangeRateProps} from '../../../components/exchange-rate/ExchangeRatesSlides';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {startGetRates} from '../../../store/wallet/effects';
import {startUpdateAllKeyAndWalletBalances} from '../../../store/wallet/effects/balance/balance';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {SlateDark, White} from '../../../styles/colors';
import {isDoMore, isFeaturedMerchant, isQuickLink} from '../../../utils/braze';
import {sleep} from '../../../utils/helper-methods';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import OnboardingFinishModal from '../../onboarding/components/OnboardingFinishModal';
import {BalanceUpdateError} from '../../wallet/components/ErrorMessages';
import DefaultAdvertisements from './components/advertisements/DefaultAdvertisements';
import ProfileButton from './components/HeaderProfileButton';
import ScanButton from './components/HeaderScanButton';
import LinkingButtons from './components/LinkingButtons';
import MockOffers from './components/offers/MockOffers';
import PortfolioBalance from './components/PortfolioBalance';
import DefaultQuickLinks from './components/quick-links/DefaultQuickLinks';
import {STATIC_CONTENT_CARDS_ENABLED} from '../../../constants/config';
import {HeaderContainer, HomeContainer} from './components/Styled';
import HomeSection from './components/HomeSection';

import Crypto from './components/Crypto';
import AdvertisementsList from './components/advertisements/AdvertisementsList';
import OffersCarousel from './components/offers/OffersCarousel';
import QuickLinksCarousel from './components/quick-links/QuickLinksCarousel';
import {selectCardGroups} from '../../../store/card/card.selectors';

const HomeRoot = () => {
  const dispatch = useAppDispatch();
  // const onboardingCompleted = useAppSelector(
  //   ({APP}: RootState) => APP.onboardingCompleted,
  // );
  // const showOnboardingFinishModal = async () => {
  //   await sleep(300);
  //   dispatch(AppActions.showOnboardingFinishModal());
  // };
  // useEffect(() => {
  //   if (!onboardingCompleted) {
  //     showOnboardingFinishModal();
  //   }
  // }, []);

  const navigation = useNavigation();
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const allContentCards = useAppSelector(({APP}) => APP.brazeContentCards);
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const hasKeys = Object.values(keys).length;
  const cardGroups = useAppSelector(selectCardGroups);
  const hasCards = cardGroups.length > 0;
  // Featured Merchants ("Offers")
  const memoizedOffers = useMemo(() => {
    const featuredMerchants = allContentCards.filter(isFeaturedMerchant);

    if (STATIC_CONTENT_CARDS_ENABLED && !featuredMerchants.length) {
      return MockOffers;
    }

    return featuredMerchants;
  }, [allContentCards]);

  // Advertisements ("Do More")
  const memoizedAdvertisements = useMemo(() => {
    const advertisements = allContentCards.filter(isDoMore);
    const defaults = DefaultAdvertisements.filter(advertisement => {
      if (hasCards) {
        return advertisement.id !== 'card';
      }
      return advertisement;
    });
    return [...defaults, ...advertisements];
  }, [allContentCards, hasCards]);

  // Exchange Rates
  const priceHistory = useAppSelector(({WALLET}) => WALLET.priceHistory);
  const memoizedExchangeRates: Array<ExchangeRateProps> = useMemo(
    () =>
      priceHistory.reduce((ratesList, history) => {
        const option = SupportedCurrencyOptions.find(
          ({id}) => id === history.coin,
        );

        if (option) {
          const {id, img, currencyName} = option;

          ratesList.push({
            id,
            img,
            currencyName,
            average: +history.percentChange,
          });
        }

        return ratesList;
      }, [] as ExchangeRateProps[]),
    [priceHistory],
  );

  // Quick Links
  const memoizedQuickLinks = useMemo(() => {
    const quickLinks = allContentCards.filter(isQuickLink);
    return [...DefaultQuickLinks, ...quickLinks];
  }, [allContentCards]);

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
        dispatch(startUpdateAllKeyAndWalletBalances()),
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
          <HomeSection style={{marginTop: 20}}>
            <PortfolioBalance />
          </HomeSection>
        ) : null}

        {/* ////////////////////////////// CTA BUY SWAP RECEIVE SEND BUTTONS */}
        {hasKeys ? (
          <HomeSection>
            <LinkingButtons
              receive={{
                cta: () =>
                  navigation.navigate('Wallet', {
                    screen: 'GlobalSelect',
                    params: {context: 'receive'},
                  }),
              }}
              send={{
                cta: () =>
                  navigation.navigate('Wallet', {
                    screen: 'GlobalSelect',
                    params: {context: 'send'},
                  }),
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
            onActionPress={() => console.log('TODO: see all offers')}>
            <OffersCarousel contentCards={memoizedOffers} />
          </HomeSection>
        ) : null}

        {/* ////////////////////////////// ADVERTISEMENTS */}
        {memoizedAdvertisements.length ? (
          <HomeSection title="Do More">
            <AdvertisementsList contentCards={memoizedAdvertisements} />
          </HomeSection>
        ) : null}

        {/*/!* ////////////////////////////// EXCHANGE RATES *!/*/}
        {/*{memoizedExchangeRates.length ? (*/}
        {/*  <HomeSection title="Exchange Rates">*/}
        {/*    <ExchangeRatesSlides items={memoizedExchangeRates} />*/}
        {/*  </HomeSection>*/}
        {/*) : null}*/}

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
