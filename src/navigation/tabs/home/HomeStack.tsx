import React from 'react';
import {Text, View} from 'react-native';
import {useSelector} from 'react-redux';
import {RootState} from '../../../store';
import {CurrencyList} from '../../../constants/CurrencySelectionListOptions';
import {PriceHistory} from '../../../store/wallet/wallet.models';
import ExchangeRatesSlides from '../../../components/exchange-rate/ExchangeRatesSlides';

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
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text>Home!</Text>
      <ExchangeRatesSlides items={exchangeRatesItems} />
    </View>
  );
};

export default HomeStack;
