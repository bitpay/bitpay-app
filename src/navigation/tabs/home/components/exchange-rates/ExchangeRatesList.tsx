import React, {ReactElement} from 'react';
import ExchangeRateItem from './ExchangeRateItem';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../../../components/styled/Containers';
import {HomeSectionTitle} from '../Styled';

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
  margin: 15px ${ScreenGutter} 35px ${ScreenGutter};
`;
const ExchangeRatesList: React.FC<ExchangeRateProps> = props => {
  const {items} = props;

  return (
    <ExchangeRateListContainer>
      <HomeSectionTitle>{'Exchange Rates'}</HomeSectionTitle>
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
