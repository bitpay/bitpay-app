import styled from 'styled-components/native';
import PortfolioBalance from './components/PortfolioBalance';
import CardsCarousel from './components/CardsCarousel';
import LinkingButtons from './components/LinkingButtons';
import React from 'react';
import {BaseText} from '../../../components/styled/Text';
import {ColorSchemeName, Image, TouchableOpacity} from 'react-native';
import haptic from '../../../components/haptic-feedback/haptic';
import {navigationRef} from '../../../Root';
import {useSelector} from 'react-redux';
import {RootState} from '../../../store';
import {SlateDark, White, Action} from '../../../styles/colors';
import {PriceHistory} from '../../../store/wallet/wallet.models';
import {CurrencyList} from '../../../constants/CurrencySelectionListOptions';
import ExchangeRatesSlides from '../../../components/exchange-rate/ExchangeRatesSlides';
import QuickLinksSlides from '../../../components/quick-links/QuickLinksSlides';
import OffersSlides from '../../../components/offer/OfferSlides';

const HomeContainer = styled.SafeAreaView`
  flex: 1;
`;

const Home = styled.ScrollView`
  margin-top: 20px;
  padding: 0 15px;
`;

const HomeLink = styled(BaseText)<{colorSchemaName: ColorSchemeName}>`
  font-weight: 500;
  font-size: 14px;
  color: ${({colorScheme}: {colorScheme: ColorSchemeName}) =>
    !colorScheme || colorScheme === 'light' ? Action : White};
  text-decoration: ${({colorScheme}: {colorScheme: ColorSchemeName}) =>
    !colorScheme || colorScheme === 'light' ? 'none' : 'underline'};
`;

const Title = styled(BaseText)<{colorSchemaName: ColorSchemeName}>`
  font-size: 14px;
  color: ${({colorScheme}: {colorScheme: ColorSchemeName}) =>
    !colorScheme || colorScheme === 'light' ? SlateDark : White};
`;

const HeaderContainer = styled.View<{justifyContent?: string}>`
  flex-direction: row;
  margin-top: 10px;
  justify-content: ${({justifyContent}: {justifyContent: string}) =>
    justifyContent || 'flex-start'};
`;

const HomeRoot = () => {
  const colorScheme = useSelector(({APP}: RootState) => APP.colorScheme);

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
  const exchangeRatesItems = priceHistory.map(
    (ph: PriceHistory, index: number) => {
      const currencyInfo = CurrencyList.find(
        ({id}: {id: string | number}) => id === ph.coin,
      );
      return {
        id: index,
        img: currencyInfo?.roundIcon,
        coinName: currencyInfo?.mainLabel,
        average: ph.percentChange,
      };
    },
  );

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
            <HomeLink colorSchemaName={colorScheme}>Customize</HomeLink>
          </TouchableOpacity>
        </HeaderContainer>

        <CardsCarousel />

        <LinkingButtons />

        <HeaderContainer justifyContent={'space-between'}>
          <Title colorSchemaName={colorScheme}>Limited Time Offers</Title>

          <TouchableOpacity onPress={goToOffers}>
            <HomeLink colorSchemaName={colorScheme}> See all</HomeLink>
          </TouchableOpacity>
        </HeaderContainer>

        <OffersSlides items={offerItems} />

        <HeaderContainer>
          <Title colorSchemaName={colorScheme}>Exchange Rates</Title>
        </HeaderContainer>
        <ExchangeRatesSlides items={exchangeRatesItems} />

        <HeaderContainer>
          <Title colorSchemaName={colorScheme}>Quick Links</Title>
        </HeaderContainer>

        <QuickLinksSlides items={quickLinksItems} />
      </Home>
    </HomeContainer>
  );
};

export default HomeRoot;
