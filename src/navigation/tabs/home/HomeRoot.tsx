import React, {useEffect, useMemo, useState} from 'react';
import {Image, RefreshControl, ScrollView} from 'react-native';
import {ContentCard} from 'react-native-appboy-sdk';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigation, useTheme} from '@react-navigation/native';
import {RootState} from '../../../store';

import styled from 'styled-components/native';
import {SlateDark, White} from '../../../styles/colors';

import PortfolioBalance from './components/PortfolioBalance';
import CardsCarousel from './components/CardsCarousel';
import LinkingButtons from './components/LinkingButtons';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import ExchangeRatesSlides, {
  ExchangeRateProps,
} from '../../../components/exchange-rate/ExchangeRatesSlides';
import QuickLinksSlides from '../../../components/quick-links/QuickLinksSlides';
import MockOffers from './components/offers/MockOffers';
import {Offer} from './components/offers/OfferCard';
import OffersCarousel from './components/offers/OffersCarousel';
import {ScreenGutter} from '../../../components/styled/Containers';
import AdvertisementCard from '../../../components/advertisement/AdvertisementCard';
import {AdvertisementList} from '../../../components/advertisement/advertisement';
import {AppActions} from '../../../store/app';
import OnboardingFinishModal from '../../onboarding/components/OnboardingFinishModal';
import {
  isCaptionedContentCard,
  isClassicContentCard,
  isFeaturedMerchant,
} from '../../../utils/braze';
import {sleep} from '../../../utils/helper-methods';
import {useAppSelector} from '../../../utils/hooks';
import ProfileButton from './components/HeaderProfileButton';
import ScanButton from './components/HeaderScanButton';
import {startUpdateAllKeyAndWalletBalances} from '../../../store/wallet/effects/balance/balance';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {BalanceUpdateError} from '../../wallet/components/ErrorMessages';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {URL} from '../../../constants';
import {startGetRates} from '../../../store/wallet/effects';
import HomeRow from './components/HomeRow';

const LeaveFeedbackIcon = require('../../../../assets/img/home/quick-links/icon-chat.png');

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
  const id = contentCard.id;
  const uri = contentCard.image;
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
    id,
    img: {uri},
    title,
    description,
    onPress: () => {}, // TODO: go to merchant card in ShopOnline
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

  // Offers
  const allContentCards = useAppSelector(({APP}) => APP.brazeContentCards);
  const memoizedOffers = useMemo(() => {
    const featuredMerchants = allContentCards.filter(isFeaturedMerchant);

    if (__DEV__ && !featuredMerchants.length) {
      return MockOffers;
    }

    return featuredMerchants.map(contentCardToOffer);
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
  const quickLinksItems = [
    {
      id: '1',
      title: 'Leave Feedback',
      description: "Let us know how we're doing",
      img: <Image source={LeaveFeedbackIcon} />,
      onPress: () => {
        dispatch(openUrlWithInAppBrowser(URL.LEAVE_FEEDBACK));
      },
    },
  ];

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
        <HomeRow title="Do More">
          <AdvertisementCard items={AdvertisementList} />
        </HomeRow>

        {/* ////////////////////////////// EXCHANGE RATES */}
        {memoizedExchangeRates.length ? (
          <HomeRow title="Exchange Rates">
            <ExchangeRatesSlides items={memoizedExchangeRates} />
          </HomeRow>
        ) : null}

        {/* ////////////////////////////// QUICK LINKS - Leave feedback etc */}
        <HomeRow title="Quick Links">
          <QuickLinksSlides items={quickLinksItems} />
        </HomeRow>
      </ScrollView>

      <OnboardingFinishModal />
    </HomeContainer>
  );
};

export default HomeRoot;
