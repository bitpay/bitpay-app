import styled from 'styled-components/native';
import PortfolioBalance from './components/PortfolioBalance';
import CardsCarousel from './components/CardsCarousel';
import LinkingButtons from './components/LinkingButtons';
import React from 'react';
import {BaseText} from '../../../components/styled/Text';
import {ColorSchemeName, TouchableOpacity} from 'react-native';
import haptic from '../../../components/haptic-feedback/haptic';
import {navigationRef} from '../../../Root';
import {useSelector} from 'react-redux';
import {RootState} from '../../../store';
import {SlateDark, White, Action} from '../../../styles/colors';
import {PriceHistory} from '../../../store/wallet/wallet.models';
import {CurrencyList} from '../../../constants/CurrencySelectionListOptions';
import ExchangeRatesSlides from '../../../components/exchange-rate/ExchangeRatesSlides';

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
  color: ${({colorSchemeName}: {colorSchemeName: ColorSchemeName}) =>
    !colorSchemeName || colorSchemeName === 'light' ? Action : White};
  text-decoration: ${({colorSchemeName}: {colorSchemeName: ColorSchemeName}) =>
    !colorSchemeName || colorSchemeName === 'light' ? 'none' : 'underline'};
`;

const Title = styled(BaseText)<{colorSchemaName: ColorSchemeName}>`
  font-size: 14px;
  color: ${({colorSchemeName}: {colorSchemeName: ColorSchemeName}) =>
    !colorSchemeName || colorSchemeName === 'light' ? SlateDark : White};
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

        <HeaderContainer>
          <Title colorSchemaName={colorScheme}>Exchange Rates</Title>
        </HeaderContainer>

        <ExchangeRatesSlides items={exchangeRatesItems} />
      </Home>
    </HomeContainer>
  );
};

export default HomeRoot;
