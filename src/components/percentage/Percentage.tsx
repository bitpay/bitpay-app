import styled, {useTheme} from 'styled-components/native';
import * as React from 'react';
import IncrementArrow from '../icons/trend-arrow/IncrementArrow';
import DecrementArrow from '../icons/trend-arrow/DecrementArrow';
import {BaseText} from '../styled/Text';
import {Slate30, SlateDark} from '../../styles/colors';

const PercentageContainer = styled(BaseText)<{
  color?: string;
}>`
  font-size: 13px;
  color: ${({color}) => color};
`;

const PercentageRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const RangeLabel = styled(BaseText)`
  font-size: 13px;
  color: ${({theme}) => (theme.dark ? Slate30 : SlateDark)};
  font-weight: 400;
  margin-left: 5px;
`;

export interface PercentageProps {
  percentageDifference: number;
  hideArrow?: boolean;
  hideSign?: boolean;
  priceChange?: string | number;
  rangeLabel?: string;
}

const Percentage = ({
  percentageDifference,
  hideArrow = false,
  hideSign = false,
  priceChange,
  rangeLabel,
}: PercentageProps) => {
  const theme = useTheme();
  const isDarkMode = theme.dark;
  const percentageColor =
    percentageDifference >= 0
      ? isDarkMode
        ? '#00954F'
        : '#004D27'
      : '#DA3636';
  const formattedPriceChange =
    priceChange === null || priceChange === undefined
      ? undefined
      : String(priceChange);
  const shouldShowPriceChange = Boolean(formattedPriceChange?.length);
  const signPrefix = hideSign ? '' : percentageDifference < 0 ? '- ' : '+ ';
  const percentageValue = `${signPrefix}${Math.abs(percentageDifference)}%`;
  const wrappedPercentageValue = shouldShowPriceChange
    ? `(${percentageValue})`
    : percentageValue;

  return (
    <>
      <PercentageRow>
        {!hideArrow && percentageDifference > 0 ? (
          <IncrementArrow style={{marginRight: 5}} />
        ) : null}
        {!hideArrow && percentageDifference < 0 ? (
          <DecrementArrow style={{marginRight: 5}} />
        ) : null}
        {shouldShowPriceChange ? (
          <PercentageContainer color={percentageColor} style={{marginRight: 3}}>
            {formattedPriceChange}
          </PercentageContainer>
        ) : null}
        <PercentageContainer color={percentageColor}>
          {wrappedPercentageValue}
        </PercentageContainer>
        {rangeLabel ? <RangeLabel>{rangeLabel}</RangeLabel> : null}
      </PercentageRow>
    </>
  );
};

export default Percentage;
