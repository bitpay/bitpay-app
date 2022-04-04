import React, {ReactElement} from 'react';
import ExchangeRateItem from './ExchangeRateItem';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../../../components/styled/Containers';

export interface ExchangeRateItemProps {
  id: string;
  img: string | ((props: any) => ReactElement);
  currencyName?: string;
  currencyAbbreviation?: string;
  average?: number;
  currentPrice?: number;
  priceDisplay?: Array<any>;
}
interface ExchangeRateProps {
  items: Array<ExchangeRateItemProps>;
}

const ExchangeRateListContainer = styled.View`
  margin: 0 ${ScreenGutter};
`;
const ExchangeRatesList: React.FC<ExchangeRateProps> = props => {
  const {items} = props;

  return (
    <ExchangeRateListContainer>
      {items.map(item => (
        <ExchangeRateItem
          item={item}
          key={item.id}
          onPress={() => {
            // TODO
          }}
        />
      ))}
    </ExchangeRateListContainer>
  );
};

export default ExchangeRatesList;
