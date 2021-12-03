import React from 'react';
import {ScrollView} from 'react-native';
import styled from 'styled-components/native';
import CardsCarousel from './components/CardsCarousel';
import {useSelector} from 'react-redux';
import {RootState} from '../../../store';
import {CurrencyList} from '../../../constants/CurrencySelectionListOptions';
import {PriceHistory} from '../../../store/wallet/wallet.models';
import ExchangeRatesSlides from '../../../components/exchange-rate/ExchangeRatesSlides';

const HomeContainer = styled.SafeAreaView`
  flex: 1;
`;

const HomeStack = () => {
  const priceHistory = useSelector(
    ({WALLET}: RootState) => WALLET.priceHistory,
  );
  const exchangeRatesItems = priceHistory.map(
    (ph: PriceHistory, index: number) => {
      const currencyInfo = CurrencyList.find(
        ({secondaryLabel}: {secondaryLabel: string}) =>
          secondaryLabel === ph.coin,
      );
      return {
        id: index,
        img: currencyInfo?.img,
        coinName: currencyInfo?.mainLabel,
        average: ph.priceDisplayPercentChange,
      };
    },
  );

  return (
    <HomeContainer>
      <ScrollView>
        <CardsCarousel />
        <ExchangeRatesSlides items={exchangeRatesItems} />
      </ScrollView>
    </HomeContainer>
  );
};

export default HomeStack;
