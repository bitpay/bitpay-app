import React from 'react';
import styled from 'styled-components/native';
import CardsCarousel from './components/CardsCarousel';
import {useSelector} from 'react-redux';
import {RootState} from '../../../store';
import {CurrencyList} from '../../../constants/CurrencySelectionListOptions';
import {PriceHistory} from '../../../store/wallet/wallet.models';
import ExchangeRatesSlides from '../../../components/exchange-rate/ExchangeRatesSlides';
import {StyleSheet, View} from 'react-native';
import AdvertisementCard from '../../../components/advertisement/AdvertisementCard';
import {SectionTitle} from '../../../components/styled/Text';

const HomeContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  padding: 10px;
`;

const HomeStack = () => {
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
  const styles = StyleSheet.create({
    container: {
      marginTop: 20,
    },
    sectionTitle: {
      marginLeft: 16,
    },
  });
  return (
    <HomeContainer>
      <ScrollView>
        <CardsCarousel />
        <ExchangeRatesSlides items={exchangeRatesItems} />
      </ScrollView>

      <View style={styles.container}>
      <SectionTitle style={styles.sectionTitle}>Do more</SectionTitle>
      <AdvertisementCard id="swapCrypto" />
      <AdvertisementCard id="buyCrypto" />
    </View>
    </HomeContainer>
  );
};

export default HomeStack;
