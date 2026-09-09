import {useTheme} from '../../contexts';
import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import IncrementArrow from '../icons/trend-arrow/IncrementArrow';
import DecrementArrow from '../icons/trend-arrow/DecrementArrow';
import {BaseText} from '../styled/Text';
import {Slate30, SlateDark} from '../../styles/colors';

export const getNeutralChangeColor = (isDarkMode: boolean) =>
  isDarkMode ? Slate30 : SlateDark;

const styles = StyleSheet.create({
  percentageContainer: {
    fontSize: 13,
    lineHeight: 18,
  },
  percentageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rangeLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    marginLeft: 5,
  },
});

export interface PercentageProps {
  percentageDifference: number;
  hideArrow?: boolean;
  hideSign?: boolean;
  priceChange?: string | number;
  rangeLabel?: string;
  suffix?: string;
  textStyle?: any;
  fractionDigits?: number;
}

export const getDifferenceColor = (isPositive: boolean, isDarkMode: boolean) =>
  isPositive ? (isDarkMode ? '#00954F' : '#004D27') : '#DA3636';

export const getPercentageColor = ({
  percentageDifference,
  isDarkMode,
}: {
  percentageDifference: number;
  isDarkMode: boolean;
}) =>
  !Number.isFinite(percentageDifference) || percentageDifference === 0
    ? getNeutralChangeColor(isDarkMode)
    : getDifferenceColor(percentageDifference >= 0, isDarkMode);

const Percentage = ({
  percentageDifference,
  hideArrow = false,
  hideSign = false,
  priceChange,
  rangeLabel,
  suffix,
  textStyle,
  fractionDigits,
}: PercentageProps) => {
  const theme = useTheme();
  const isDarkMode = theme.dark;
  const {i18n} = useTranslation();
  const locale = i18n?.language;

  const isFiniteDifference = Number.isFinite(percentageDifference);
  const safeDifference = isFiniteDifference ? percentageDifference : 0;
  const percentageColor = getPercentageColor({
    percentageDifference,
    isDarkMode,
  });

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
    priceChange == null ? undefined : String(priceChange);
  const shouldShowPriceChange = Boolean(formattedPriceChange?.length);
  const signPrefix =
    !isFiniteDifference || hideSign ? '' : safeDifference < 0 ? '- ' : '+ ';
  const percentageValue = isFiniteDifference
    ? `${signPrefix}${formatter.format(Math.abs(safeDifference))}%`
    : '--';
  const wrappedPercentageValue = shouldShowPriceChange
    ? `(${percentageValue})`
    : percentageValue;

  return (
    <View style={styles.percentageRow}>
      {!hideArrow && isFiniteDifference && safeDifference > 0 ? (
        <IncrementArrow style={{marginRight: 5}} />
      ) : null}
      {!hideArrow && isFiniteDifference && safeDifference < 0 ? (
        <DecrementArrow style={{marginRight: 5}} />
      ) : null}
      {shouldShowPriceChange ? (
        <BaseText
          style={[
            styles.percentageContainer,
            {color: percentageColor},
            textStyle,
            {marginRight: 3},
          ]}>
          {formattedPriceChange}
        </BaseText>
      ) : null}
      <BaseText
        style={[
          styles.percentageContainer,
          {color: percentageColor},
          textStyle,
        ]}>
        {wrappedPercentageValue}
        {suffix}
      </BaseText>
      {rangeLabel ? (
        <BaseText
          style={[
            styles.rangeLabel,
            {color: getNeutralChangeColor(theme.dark)},
          ]}>
          {rangeLabel}
        </BaseText>
      ) : null}
    </View>
  );
};

export default Percentage;
