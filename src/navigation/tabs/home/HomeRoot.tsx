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

const HomeContainer = styled.SafeAreaView`
  flex: 1;
`;

const Home = styled.ScrollView`
  margin-top: 20px;
  padding: 0 15px;
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
  margin-top: 10px;
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
