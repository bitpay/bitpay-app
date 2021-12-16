import styled from 'styled-components/native';
import PortfolioBalance from './components/PortfolioBalance';
import CardsCarousel from './components/CardsCarousel';
import LinkingButtons from './components/LinkingButtons';
import React from 'react';
import {BaseText} from '../../../components/styled/Text';
import {Image, TouchableOpacity} from 'react-native';
import haptic from '../../../components/haptic-feedback/haptic';
import {navigationRef} from '../../../Root';
import {useSelector} from 'react-redux';
import {RootState} from '../../../store';
import {SlateDark, White, Action} from '../../../styles/colors';
import {PriceHistory} from '../../../store/wallet/wallet.models';
import {CurrencyList} from '../../../constants/CurrencySelectionListOptions';
import ExchangeRatesSlides, {
  ExchangeRateProps,
} from '../../../components/exchange-rate/ExchangeRatesSlides';
import QuickLinksSlides from '../../../components/quick-links/QuickLinksSlides';
import OffersSlides from '../../../components/offer/OfferSlides';
import {useTheme} from '@react-navigation/native';
import {ScreenGutter} from '../../../components/styled/Containers';
import AdvertisementCard, {
  AdvertisementProps,
} from '../../../components/advertisement/AdvertisementCard';
import AdvBuyImg from '../../../../assets/img/advertisement/adv-buy.svg';
import AdvSwapImg from '../../../../assets/img/advertisement/adv-swap.svg';

const HomeContainer = styled.SafeAreaView`
  flex: 1;
`;

const Home = styled.ScrollView`
  margin-top: 20px;
`;

const HomeLink = styled(BaseText)<{isDark: boolean}>`
  font-weight: 500;
  font-size: 14px;
  color: ${({isDark}) => (isDark ? White : Action)};
  text-decoration: ${({isDark}) => (isDark ? 'underline' : 'none')};
  text-decoration-color: ${White};
`;

const Title = styled(BaseText)<{isDark: boolean}>`
  font-size: 14px;
  color: ${({isDark}) => (isDark ? White : SlateDark)};
`;

const HeaderContainer = styled.View<{justifyContent?: string}>`
  flex-direction: row;
  margin: 10px ${ScreenGutter} 0;
  justify-content: ${({justifyContent}) => justifyContent || 'flex-start'};
`;

const HomeRoot = () => {
  const theme = useTheme();

  const goToCustomize = () => {
    haptic('impactLight');
    navigationRef.navigate('GeneralSettings', {
      screen: 'CustomizeHome',
    });
  };

  const goToOffers = () => {};

  // Exchange Rates
  const priceHistory = useSelector(
    ({WALLET}: RootState) => WALLET.priceHistory,
  );
  const exchangeRatesItems: Array<ExchangeRateProps> = [];
  priceHistory.forEach((ph: PriceHistory, index: number) => {
    const currencyInfo = CurrencyList.find(
      ({id}: {id: string | number}) => id === ph.coin,
    );
    exchangeRatesItems.push({
      id: index,
      img: currencyInfo?.roundIcon(20),
      coinName: currencyInfo?.mainLabel,
      average: +ph.percentChange,
      theme,
    });
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
      onPress: () => {},
      theme,
    },
  ];

  // Limited time offers
  const offerItems = [
    {
      id: 1,
      title: 'JOMASHOP',
      description: '20% off select products for BitPay customers.',
      img: (
        <Image
          source={require('../../../../assets/img/home/offers/jomashop.png')}
        />
      ),
      onPress: () => {},
    },
    {
      id: 2,
      title: 'AIRBNB',
      description: '20% off select products for BitPay customers.',
      img: (
        <Image
          source={require('../../../../assets/img/home/offers/airbnb.png')}
        />
      ),
      onPress: () => {},
    },
  ];

  // Advertisement Cards
  const advertisementList: AdvertisementProps[] = [
    {
      id: 'buyCrypto',
      title: 'Buy Crypto',
      text: 'Exchange ERC-20 Tokens or cross chain assets',
      img: <AdvBuyImg />,
      onPress: () => {
        navigationRef.navigate('BuyCrypto', {screen: 'Root'});
      },
    },
    {
      id: 'swapCrypto',
      title: 'Swap Crypto',
      text: 'Buy direct using your debit or credit card',
      img: <AdvSwapImg />,
      onPress: () => {
        navigationRef.navigate('SwapCrypto', {screen: 'Root'});
      },
    },
  ];

  return (
    <HomeContainer>
      <Home>
        <PortfolioBalance />

        <HeaderContainer justifyContent={'flex-end'}>
          <TouchableOpacity onPress={goToCustomize}>
            <HomeLink isDark={theme.dark}>Customize</HomeLink>
          </TouchableOpacity>
        </HeaderContainer>

        <CardsCarousel />

        <LinkingButtons />

        <HeaderContainer justifyContent={'space-between'}>
          <Title isDark={theme.dark}>Limited Time Offers</Title>

          <TouchableOpacity onPress={goToOffers}>
            <HomeLink isDark={theme.dark}> See all</HomeLink>
          </TouchableOpacity>
        </HeaderContainer>

        <OffersSlides items={offerItems} />

        <HeaderContainer>
          <Title isDark={theme.dark}>Do More</Title>
        </HeaderContainer>

        <AdvertisementCard items={advertisementList} />

        {exchangeRatesItems.length > 0 && (
          <>
            <HeaderContainer>
              <Title isDark={theme.dark}>Exchange Rates</Title>
            </HeaderContainer>

            <ExchangeRatesSlides items={exchangeRatesItems} />
          </>
        )}

        <HeaderContainer>
          <Title isDark={theme.dark}>Quick Links</Title>
        </HeaderContainer>

        <QuickLinksSlides items={quickLinksItems} />
      </Home>
    </HomeContainer>
  );
};

export default HomeRoot;
