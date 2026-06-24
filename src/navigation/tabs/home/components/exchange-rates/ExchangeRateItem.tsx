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
} from '../../../../../utils/helper-methods';
import {ExchangeRateItemProps} from './ExchangeRatesList';
import {NeutralSlate, Slate30, SlateDark} from '../../../../../styles/colors';
import {View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import Percentage from '../../../../../components/percentage/Percentage';

const RowContainer = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  margin: 10px 0;
`;

const NoteContainer = styled(Column)`
  align-items: flex-end;
  gap: 4px;
`;

const SubTextContainer = styled.View`
  align-items: center;
  flex-direction: row;
`;

const ExchangeRateText = styled(H7)`
  font-size: 16px;
  font-weight: 400;
`;

const ExchangeRateCode = styled(BaseText)`
  font-weight: 500;
  font-size: 10px;
  padding-left: 2px;
  color: ${({theme: {dark}}) => (dark ? NeutralSlate : SlateDark)};
`;

const ExchangeRateSubText = styled(Smallest)`
  line-height: 20px;
  font-size: 13px;
  color: ${({theme}) => (theme.dark ? Slate30 : SlateDark)};
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

  const {amount, code} = formatFiatAmountObj(
    currentPrice!,
    defaultAltCurrencyIsoCode,
    {
      customPrecision: 'minimal',
      currencyAbbreviation,
    },
  );

  return (
    <RowContainer
      activeOpacity={ActiveOpacity}
      testID={`home-exchange-rate-item-${item.id}`}
      accessibilityLabel={`${currencyName} exchange rate`}
      onPress={onPress}>
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
          <>
            <ExchangeRateText>
              {amount}
              {code ? (
                <View>
                  <ExchangeRateCode>{code}</ExchangeRateCode>
                </View>
              ) : null}
            </ExchangeRateText>
            <SubTextContainer>
              <Percentage percentageDifference={average || 0} hideArrow />
            </SubTextContainer>
          </>
        ) : null}
      </NoteContainer>
    </RowContainer>
  );
};

export default ExchangeRateItem;
