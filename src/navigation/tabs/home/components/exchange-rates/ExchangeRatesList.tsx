import {useNavigation} from '@react-navigation/native';
import React, {ReactElement} from 'react';
import styled from 'styled-components/native';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {ScreenGutter} from '../../../../../components/styled/Containers';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {useAppDispatch} from '../../../../../utils/hooks';
import ExchangeRateItem from './ExchangeRateItem';
import {
  BitpaySupportedCoins,
  BitpaySupportedTokens,
} from '../../../../../constants/currencies';
import {getCurrencyAbbreviation} from '../../../../../utils/helper-methods';

export interface ExchangeRateItemProps {
  id: string;
  img: string | ((props: any) => ReactElement);
  currencyName: string;
  chain: string;
  currencyAbbreviation: string;
  tokenAddress?: string;
  average?: number;
  currentPrice?: number;
}

const ExchangeRateListContainer = styled.View`
  margin: 10px ${ScreenGutter} 10px;
`;
interface ExchangeRateProps {
  items: Array<ExchangeRateItemProps>;
  defaultAltCurrencyIsoCode: string;
}

const ExchangeRatesList: React.FC<ExchangeRateProps> = props => {
  const {items, defaultAltCurrencyIsoCode} = props;
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  return (
    <ExchangeRateListContainer>
      {items.map(item => (
        <ExchangeRateItem
          item={item}
          key={item.id}
          onPress={() => {
            const currencyName = getCurrencyAbbreviation(
              item.tokenAddress ? item.tokenAddress : item.currencyAbbreviation,
              item.chain,
            );
            const isStableCoin =
              BitpaySupportedCoins[currencyName]?.properties?.isStableCoin ||
              BitpaySupportedTokens[currencyName]?.properties?.isStableCoin;
            if (!isStableCoin) {
              haptic('impactLight');
              dispatch(
                Analytics.track('Clicked Exchange Rate', {
                  coin: item.currencyAbbreviation || '',
                }),
              );
              navigation.navigate('PriceCharts', {item});
            }
          }}
          defaultAltCurrencyIsoCode={defaultAltCurrencyIsoCode}
        />
      ))}
    </ExchangeRateListContainer>
  );
};

export default ExchangeRatesList;
