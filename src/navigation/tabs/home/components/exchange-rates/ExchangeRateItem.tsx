import React from 'react';
import styled from 'styled-components/native';
import {CurrencyImage} from '../../../../../components/currency-image/CurrencyImage';
import {
  ActiveOpacity,
  Column,
  CurrencyColumn,
  CurrencyImageContainer,
} from '../../../../../components/styled/Containers';
import {H7, Smallest, BaseText} from '../../../../../components/styled/Text';
import {
  formatCurrencyAbbreviation,
  formatFiatAmountObj,
  getRateByCurrencyName,
} from '../../../../../utils/helper-methods';
import GainArrow from '../../../../../../assets/img/home/exchange-rates/increment-arrow.svg';
import LossArrow from '../../../../../../assets/img/home/exchange-rates/decrement-arrow.svg';
import NeutralArrow from '../../../../../../assets/img/home/exchange-rates/flat-arrow.svg';
import {ExchangeRateItemProps} from './ExchangeRatesList';
import {
  LuckySevens,
  NeutralSlate,
  SlateDark,
} from '../../../../../styles/colors';
import {View} from 'react-native';
import {useAppSelector} from '../../../../../utils/hooks';
import {TouchableOpacity} from 'react-native-gesture-handler';

const RowContainer = styled(TouchableOpacity)`
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

const ExchangeRateCode = styled(BaseText)`
  font-weight: 500;
  font-size: 10px;
  padding-left: 2px;
  color: ${({theme: {dark}}) => (dark ? NeutralSlate : SlateDark)};
`;

const ExchangeRateSubText = styled(Smallest)`
  line-height: 20px;
  color: ${({theme}) => (theme.dark ? LuckySevens : SlateDark)};
`;

const showLossGainOrNeutralArrow = (average: number | undefined) => {
  if (average === undefined) {
    return;
  }

  if (average > 0) {
    return <GainArrow style={{marginRight: 5}} />;
  } else if (average < 0) {
    return <LossArrow style={{marginRight: 5}} />;
  } else {
    return <NeutralArrow style={{marginRight: 5}} />;
  }
};

const ExchangeRateItem = ({
  item,
  onPress,
  defaultAltCurrencyIsoCode,
}: {
  item: ExchangeRateItemProps;
  onPress: () => void;
  defaultAltCurrencyIsoCode: string;
}) => {
  const allRates = useAppSelector(({RATE}) => RATE.rates);
  let currentPriceToShow: number | undefined;
  const {
    img,
    currencyName,
    currentPrice,
    average,
    currencyAbbreviation,
    chain,
  } = item;

  // Avoid displaying rounded values for low amounts
  if (
    currencyAbbreviation &&
    allRates &&
    ['doge', 'xrp'].includes(currencyAbbreviation.toLowerCase()) &&
    getRateByCurrencyName(allRates, currencyAbbreviation.toLowerCase(), chain)
  ) {
    currentPriceToShow = getRateByCurrencyName(
      allRates,
      currencyAbbreviation.toLowerCase(),
      chain,
    ).find(r => r.code === defaultAltCurrencyIsoCode)!.rate;
  } else {
    currentPriceToShow = currentPrice;
  }

  const {amount, code} = formatFiatAmountObj(
    currentPriceToShow!,
    defaultAltCurrencyIsoCode,
    {
      customPrecision: 'minimal',
      currencyAbbreviation,
    },
  );

  return (
    <RowContainer activeOpacity={ActiveOpacity} onPress={onPress}>
      <CurrencyImageContainer style={{width: 40, height: 40}}>
        <CurrencyImage img={img} size={40} />
      </CurrencyImageContainer>
      <CurrencyColumn>
        <ExchangeRateText ellipsizeMode="tail" numberOfLines={1}>
          {currencyName}
        </ExchangeRateText>
        {currencyAbbreviation ? (
          <ExchangeRateSubText>
            {formatCurrencyAbbreviation(currencyAbbreviation)}
          </ExchangeRateSubText>
        ) : null}
      </CurrencyColumn>
      <NoteContainer>
        {currentPrice ? (
          <ExchangeRateText>
            {amount}
            {code ? (
              <View>
                <ExchangeRateCode>{code}</ExchangeRateCode>
              </View>
            ) : null}
          </ExchangeRateText>
        ) : null}
        <SubTextContainer>
          {showLossGainOrNeutralArrow(average)}
          <ExchangeRateSubText>{Math.abs(average || 0)}%</ExchangeRateSubText>
        </SubTextContainer>
      </NoteContainer>
    </RowContainer>
  );
};

export default ExchangeRateItem;
