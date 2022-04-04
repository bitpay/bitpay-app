import React from 'react';
import styled from 'styled-components/native';
import {CurrencyImage} from '../../../../../components/currency-image/CurrencyImage';
import {
  ActiveOpacity,
  Column,
  CurrencyColumn,
  CurrencyImageContainer,
  Row,
} from '../../../../../components/styled/Containers';
import {H5, SubText} from '../../../../../components/styled/Text';
import {formatFiatAmount} from '../../../../../utils/helper-methods';
import IncrementArrow from '../../../../../../assets/img/home/exchange-rates/increment-arrow.svg';
import DecrementArrow from '../../../../../../assets/img/home/exchange-rates/decrement-arrow.svg';
import {ExchangeRateItemProps} from './ExchangeRatesList';

const RowContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  margin: 10px 0;
`;

const NoteContainer = styled(Column)`
  align-items: flex-end;
`;

const SubTextContainer = styled.View`
  align-items: center;
  flex-direction: row;
`;

const ExchangeRateItem = ({
  item,
  onPress,
}: {
  item: ExchangeRateItemProps;
  onPress: () => void;
}) => {
  const {img, currencyName, currentPrice, average, currencyAbbreviation} = item;

  return (
    <RowContainer activeOpacity={ActiveOpacity} onPress={onPress}>
      <CurrencyImageContainer>
        <CurrencyImage img={img} size={45} />
      </CurrencyImageContainer>
      <CurrencyColumn>
        <Row>
          <H5 ellipsizeMode="tail" numberOfLines={1}>
            {currencyName}
          </H5>
        </Row>
        <SubText>{currencyAbbreviation?.toUpperCase()}</SubText>
      </CurrencyColumn>
      <NoteContainer>
        {currentPrice && <H5>{formatFiatAmount(currentPrice, 'USD')}</H5>}
        <SubTextContainer>
          {average && average > 0 ? (
            <IncrementArrow style={{marginRight: 5}} />
          ) : null}
          {average && average < 0 ? (
            <DecrementArrow style={{marginRight: 5}} />
          ) : null}
          <SubText>{average}%</SubText>
        </SubTextContainer>
      </NoteContainer>
    </RowContainer>
  );
};

export default ExchangeRateItem;
