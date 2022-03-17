import React, {useEffect, useState} from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {useDispatch} from 'react-redux';
import {useNavigation, useTheme} from '@react-navigation/native';
import {RootState} from '../../../store';
import {PriceHistory} from '../../../store/wallet/wallet.models';

import styled from 'styled-components/native';
import {BaseText} from '../../../components/styled/Text';
import {SlateDark, White} from '../../../styles/colors';

import PortfolioBalance from './components/PortfolioBalance';
import CardsCarousel from './components/CardsCarousel';
import LinkingButtons from './components/LinkingButtons';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import ExchangeRatesSlides, {
  ExchangeRateProps,
} from '../../../components/exchange-rate/ExchangeRatesSlides';
import QuickLinksSlides from '../../../components/quick-links/QuickLinksSlides';
import OffersSlides from '../../../components/offer/OfferSlides';
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../components/styled/Containers';
import AdvertisementCard from '../../../components/advertisement/AdvertisementCard';
import {AdvertisementList} from '../../../components/advertisement/advertisement';
import OnboardingFinishModal from '../../onboarding/components/OnboardingFinishModal';
import {sleep} from '../../../utils/helper-methods';
import ProfileButton from './components/HeaderProfileButton';
import ScanButton from './components/HeaderScanButton';
import {startUpdateAllKeyAndWalletBalances} from '../../../store/wallet/effects/balance/balance';
import {
  setHomeCarouselConfig,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {BalanceUpdateError} from '../../wallet/components/ErrorMessages';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {URL} from '../../../constants';
import {startGetRates} from '../../../store/wallet/effects';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';

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

export const HomeLink = styled(BaseText)`
  font-weight: 500;
  font-size: 14px;
  color: ${({theme}) => theme.colors.link};
  text-decoration: ${({theme: {dark}}) => (dark ? 'underline' : 'none')};
  text-decoration-color: ${White};
`;

const Title = styled(BaseText)`
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

export const SectionHeaderContainer = styled.View<{justifyContent?: string}>`
  flex-direction: row;
  margin: 10px ${ScreenGutter} 0;
  justify-content: ${({justifyContent}) => justifyContent || 'flex-start'};
`;

const HomeRoot = () => {
  const dispatch = useDispatch();
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

  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);
  const _keys = useAppSelector(({WALLET}) => WALLET.keys);
  const _cards = useAppSelector(({CARD, APP}) => CARD.cards[APP.network]);
  if (!homeCarouselConfig) {
    const keys = Object.values(_keys).map(key => ({
      id: key.id,
      show: true,
    }));
    const cards = _cards.map(_ => ({
      id: 'bitpayCard',
      show: true,
    }));
    dispatch(setHomeCarouselConfig([...keys, ...cards]));
  }

  const navigation = useNavigation();
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);

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

  // Exchange Rates
  const priceHistory = useAppSelector(
    ({WALLET}: RootState) => WALLET.priceHistory,
  );
  const exchangeRatesItems: Array<ExchangeRateProps> = [];
  priceHistory.forEach((ph: PriceHistory) => {
    const option = SupportedCurrencyOptions.find(
      ({id}: {id: string | number}) => id === ph.coin,
    );

    if (option) {
      const {id, img, currencyName} = option;
      exchangeRatesItems.push({
        id,
        img,
        currencyName,
        average: +ph.percentChange,
      });
    }
  });

  // Quick Links
  const quickLinksItems = [
    {
      id: '1',
      title: 'Leave Feedback',
      description: "Let us know how we're doing",
      img: (
        <Image
          source={require('../../../../assets/img/home/quick-links/icon-chat.png')}
        />
      ),
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
        {showPortfolioValue && <PortfolioBalance />}

        {/* ////////////////////////////// CARDS CAROUSEL */}
        <CardsCarousel />

        {/* ////////////////////////////// CTA BUY SWAP RECEIVE SEND BUTTONS */}
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

        {/* ////////////////////////////// LIMITED TIME OFFERS */}
        <SectionHeaderContainer justifyContent={'space-between'}>
          <Title>Limited Time Offers</Title>
          <TouchableOpacity
            activeOpacity={ActiveOpacity}
            onPress={() => console.log('offers')}>
            <HomeLink> See all</HomeLink>
          </TouchableOpacity>
        </SectionHeaderContainer>
        <OffersSlides />

        {/* ////////////////////////////// ADVERTISEMENTS */}
        <SectionHeaderContainer>
          <Title>Do More</Title>
        </SectionHeaderContainer>

        <AdvertisementCard items={AdvertisementList} />

        {/* ////////////////////////////// EXCHANGE RATES */}
        {exchangeRatesItems.length > 0 && (
          <>
            <SectionHeaderContainer>
              <Title>Exchange Rates</Title>
            </SectionHeaderContainer>
            <ExchangeRatesSlides items={exchangeRatesItems} />
          </>
        )}

        {/* ////////////////////////////// QUICK LINKS - Leave feedback etc */}
        <SectionHeaderContainer>
          <Title>Quick Links</Title>
        </SectionHeaderContainer>
        <QuickLinksSlides items={quickLinksItems} />
      </ScrollView>
      <OnboardingFinishModal />
    </HomeContainer>
  );
};

export default HomeRoot;
