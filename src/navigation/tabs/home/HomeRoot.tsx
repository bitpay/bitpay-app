import {useNavigation, useTheme} from '@react-navigation/native';
import React, {useEffect, useMemo, useState} from 'react';
import {RefreshControl, ScrollView} from 'react-native';
import {ContentCard} from 'react-native-appboy-sdk';
import {useDispatch, useSelector} from 'react-redux';
import styled from 'styled-components/native';
import ExchangeRatesSlides, {
  ExchangeRateProps,
} from '../../../components/exchange-rate/ExchangeRatesSlides';
import {ScreenGutter} from '../../../components/styled/Containers';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import {RootState} from '../../../store';
import {AppActions, AppEffects} from '../../../store/app';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {startGetRates} from '../../../store/wallet/effects';
import {startUpdateAllKeyAndWalletBalances} from '../../../store/wallet/effects/balance/balance';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {SlateDark, White} from '../../../styles/colors';
import {
  isCaptionedContentCard,
  isClassicContentCard,
  isDoMore,
  isFeaturedMerchant,
  isQuickLink,
} from '../../../utils/braze';
import {sleep} from '../../../utils/helper-methods';
import {useAppSelector} from '../../../utils/hooks';
import OnboardingFinishModal from '../../onboarding/components/OnboardingFinishModal';
import {BalanceUpdateError} from '../../wallet/components/ErrorMessages';
import {Advertisement} from './components/advertisements/AdvertisementCard';
import AdvertisementsList from './components/advertisements/AdvertisementsList';
import MockAdvertisements from './components/advertisements/MockAdvertisements';
import CardsCarousel from './components/CardsCarousel';
import ProfileButton from './components/HeaderProfileButton';
import ScanButton from './components/HeaderScanButton';
import HomeRow from './components/HomeRow';
import LinkingButtons from './components/LinkingButtons';
import MockOffers from './components/offers/MockOffers';
import {Offer} from './components/offers/OfferCard';
import OffersCarousel from './components/offers/OffersCarousel';
import PortfolioBalance from './components/PortfolioBalance';
import MockQuickLinks from './components/quick-links/MockQuickLinks';
import {QuickLink} from './components/quick-links/QuickLinksCard';
import QuickLinksCarousel from './components/quick-links/QuickLinksCarousel';

const HeaderContainer = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  margin: 10px ${ScreenGutter};
`;

export const HeaderButtonContainer = styled.View`
  margin-left: ${ScreenGutter};
`;

const HomeContainer = styled.SafeAreaView`
  flex: 1;
`;

export const SectionHeaderContainer = styled.View<{justifyContent?: string}>`
  flex-direction: row;
  margin: 10px ${ScreenGutter} 0;
  justify-content: ${({justifyContent}) => justifyContent || 'flex-start'};
`;

const contentCardToOffer = (contentCard: ContentCard): Offer => {
  let title = '';
  let description = '';

  if (
    isClassicContentCard(contentCard) ||
    isCaptionedContentCard(contentCard)
  ) {
    title = contentCard.title;
    description = contentCard.cardDescription;
  }

  return {
    id: contentCard.id,
    img: {uri: contentCard.image},
    title,
    description,
    onPress: () => {}, // TODO: go to merchant card in ShopOnline
  };
};

const contentCardToQuickLink = (contentCard: ContentCard): QuickLink => {
  let title = '';
  let description = '';

  if (
    isClassicContentCard(contentCard) ||
    isCaptionedContentCard(contentCard)
  ) {
    title = contentCard.title;
    description = contentCard.cardDescription;
  }

  return {
    id: contentCard.id,
    img: {uri: contentCard.image},
    title,
    description,
    url: contentCard.url,
    openURLInWebView: contentCard.openURLInWebView,
  };
};

const contentCardToAdvertisement = (
  contentCard: ContentCard,
): Advertisement => {
  let title = '';
  let description = '';

  if (
    isClassicContentCard(contentCard) ||
    isCaptionedContentCard(contentCard)
  ) {
    title = contentCard.title;
    description = contentCard.cardDescription;
  }

  return {
    id: contentCard.id,
    title,
    description,
    img: {uri: contentCard.image},
    url: contentCard.url,
    openURLInWebView: contentCard.openURLInWebView,
  };
};

const HomeRoot = () => {
  const dispatch = useDispatch();
  const onboardingCompleted = useSelector(
    ({APP}: RootState) => APP.onboardingCompleted,
  );

  const showOnboardingFinishModal = async () => {
    await sleep(300);
    dispatch(AppActions.showOnboardingFinishModal());
  };

  // useEffect(() => {
  //   if (!onboardingCompleted) {
  //     showOnboardingFinishModal();
  //   }
  // }, []);

  const navigation = useNavigation();
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const allContentCards = useAppSelector(({APP}) => APP.brazeContentCards);

  // Featured Merchants ("Offers")
  const memoizedOffers = useMemo(() => {
    const featuredMerchants = allContentCards.filter(isFeaturedMerchant);

    if (__DEV__ && !featuredMerchants.length) {
      return MockOffers;
    }

    return featuredMerchants.map(contentCardToOffer);
  }, [allContentCards]);

  // Advertisements ("Do More")
  const memoizedAdvertisements = useMemo(() => {
    const advertisements = allContentCards.filter(isDoMore);

    if (__DEV__ && !advertisements.length) {
      return MockAdvertisements;
    }

    return advertisements.map(contentCardToAdvertisement);
  }, [allContentCards]);

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

    if (__DEV__ && !quickLinks.length) {
      return MockQuickLinks;
    }

    return quickLinks.map(contentCardToQuickLink);
  }, [allContentCards]);

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
        <HomeRow title="Portfolio Balance" slimHeader>
          <PortfolioBalance />
        </HomeRow>

        {/* ////////////////////////////// CARDS CAROUSEL */}
        <CardsCarousel />

        {/* ////////////////////////////// CTA BUY SWAP RECEIVE SEND BUTTONS */}
        <HomeRow>
          <LinkingButtons
            receive={{cta: () => null}}
            send={{cta: () => null}}
          />
        </HomeRow>

        {/* ////////////////////////////// LIMITED TIME OFFERS */}
        {memoizedOffers.length ? (
          <HomeRow
            title="Limited Time Offers"
            action="See all"
            onActionPress={() => console.log('TODO: see all offers')}>
            <OffersCarousel offers={memoizedOffers} />
          </HomeRow>
        ) : null}

        {/* ////////////////////////////// ADVERTISEMENTS */}
        {memoizedAdvertisements.length ? (
          <HomeRow title="Do More">
            <AdvertisementsList items={memoizedAdvertisements} />
          </HomeRow>
        ) : null}

        {/* ////////////////////////////// EXCHANGE RATES */}
        {memoizedExchangeRates.length ? (
          <HomeRow title="Exchange Rates">
            <ExchangeRatesSlides items={memoizedExchangeRates} />
          </HomeRow>
        ) : null}

        {/* ////////////////////////////// QUICK LINKS - Leave feedback etc */}
        {memoizedQuickLinks.length ? (
          <HomeRow title="Quick Links">
            <QuickLinksCarousel items={memoizedQuickLinks} />
          </HomeRow>
        ) : null}
      </ScrollView>

      <OnboardingFinishModal />
    </HomeContainer>
  );
};

export default HomeRoot;
