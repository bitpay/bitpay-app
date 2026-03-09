import styled, {useTheme} from 'styled-components/native';
import React, {useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import IncrementArrow from '../icons/trend-arrow/IncrementArrow';
import DecrementArrow from '../icons/trend-arrow/DecrementArrow';
import {BaseText} from '../styled/Text';
import {Slate30, SlateDark} from '../../styles/colors';

const PercentageContainer = styled(BaseText)<{
  color?: string;
}>`
  font-size: 13px;
  line-height: 18px;
  color: ${({color}) => color};
`;

const PercentageRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const RangeLabel = styled(BaseText)`
  font-size: 13px;
  line-height: 18px;
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
  textStyle?: any;
  fractionDigits?: number;
}

export const getDifferenceColor = (
  isPositive: boolean,
  isDarkMode: boolean,
) => {
  return isPositive ? (isDarkMode ? '#00954F' : '#004D27') : '#DA3636';
};

const Percentage = ({
  percentageDifference,
  hideArrow = false,
  hideSign = false,
  priceChange,
  rangeLabel,
  textStyle,
  fractionDigits,
}: PercentageProps) => {
  const theme = useTheme();
  const isDarkMode = theme.dark;
  const {i18n} = useTranslation();
  const locale = i18n?.language;

  const isFiniteDifference = Number.isFinite(percentageDifference);
  const safeDifference = isFiniteDifference ? percentageDifference : 0;
  const percentageColor = isFiniteDifference
    ? getDifferenceColor(safeDifference >= 0, isDarkMode)
    : isDarkMode
    ? Slate30
    : SlateDark;

  const formatter = useMemo(() => {
    const options: Intl.NumberFormatOptions | undefined =
      typeof fractionDigits === 'number'
        ? {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits,
          }
        : undefined;
    try {
      return new Intl.NumberFormat(locale || undefined, options);
    } catch {
      return new Intl.NumberFormat(undefined, options);
    }
  }, [locale, fractionDigits]);
  const formattedPriceChange =
    priceChange === null || priceChange === undefined
      ? undefined
      : String(priceChange);
  const shouldShowPriceChange = Boolean(formattedPriceChange?.length);
  const signPrefix =
    !isFiniteDifference || hideSign ? '' : safeDifference < 0 ? '- ' : '+ ';
  const formattedPercentageDifference = isFiniteDifference
    ? formatter.format(Math.abs(safeDifference))
    : '--';
  const percentageValue = isFiniteDifference
    ? `${signPrefix}${formattedPercentageDifference}%`
    : '--';
  const wrappedPercentageValue = shouldShowPriceChange
    ? `(${percentageValue})`
    : percentageValue;

  return (
    <>
      <PercentageRow>
        {!hideArrow && isFiniteDifference && safeDifference > 0 ? (
          <IncrementArrow style={{marginRight: 5}} />
        ) : null}
        {!hideArrow && isFiniteDifference && safeDifference < 0 ? (
          <DecrementArrow style={{marginRight: 5}} />
        ) : null}
        {shouldShowPriceChange ? (
          <PercentageContainer
            color={percentageColor}
            style={[textStyle, {marginRight: 3}]}>
            {formattedPriceChange}
          </PercentageContainer>
        ) : null}
        <PercentageContainer color={percentageColor} style={textStyle}>
          {wrappedPercentageValue}
        </PercentageContainer>
        {rangeLabel ? <RangeLabel>{rangeLabel}</RangeLabel> : null}
      </PercentageRow>
    </>
  );
};

export default Percentage;
