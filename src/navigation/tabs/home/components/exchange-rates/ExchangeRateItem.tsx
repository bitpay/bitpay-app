import React from 'react';
import styled from 'styled-components/native';
import {CurrencyImage} from '../../../../../components/currency-image/CurrencyImage';
import {
  ActiveOpacity,
  Column,
  CurrencyColumn,
  CurrencyImageContainer,
} from '../../../../../components/styled/Containers';
import {H7, Smallest} from '../../../../../components/styled/Text';
import {formatFiatAmount} from '../../../../../utils/helper-methods';
import IncrementArrow from '../../../../../../assets/img/home/exchange-rates/increment-arrow.svg';
import DecrementArrow from '../../../../../../assets/img/home/exchange-rates/decrement-arrow.svg';
import {ExchangeRateItemProps} from './ExchangeRatesList';
import {Slate, SlateDark} from '../../../../../styles/colors';

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

const ExchangeRateText = styled(H7)`
  font-weight: 500;
`;

const ExchangeRateSubText = styled(Smallest)`
  line-height: 20px;
  color: ${({theme}) => (theme.dark ? Slate : SlateDark)};
`;

const ExchangeRateItem = ({
  item,
  onPress,
  defaultAltCurrencyIsoCode,
}: {
  item: ExchangeRateItemProps;
  onPress: () => void;
  defaultAltCurrencyIsoCode: string;
}) => {
  const {img, currencyName, currentPrice, average, currencyAbbreviation} = item;

  return (
    <RowContainer activeOpacity={ActiveOpacity} onPress={onPress}>
      <CurrencyImageContainer style={{width: 35, height: 35}}>
        <CurrencyImage img={img} size={35} />
      </CurrencyImageContainer>
      <CurrencyColumn>
        <ExchangeRateText ellipsizeMode="tail" numberOfLines={1}>
          {currencyName}
        </ExchangeRateText>
        <ExchangeRateSubText>
          {currencyAbbreviation?.toUpperCase()}
        </ExchangeRateSubText>
      </CurrencyColumn>
      <NoteContainer>
        {currentPrice && (
          <ExchangeRateText>
            {formatFiatAmount(currentPrice, defaultAltCurrencyIsoCode, {
              customPrecision: 'minimal',
              currencyAbbreviation,
            })}
          </ExchangeRateText>
        )}
        <SubTextContainer>
          {average && average > 0 ? (
            <IncrementArrow style={{marginRight: 5}} />
          ) : null}
          {average && average < 0 ? (
            <DecrementArrow style={{marginRight: 5}} />
          ) : null}
          <ExchangeRateSubText>{average}%</ExchangeRateSubText>
        </SubTextContainer>
      </NoteContainer>
    </RowContainer>
  );
};

export default ExchangeRateItem;
