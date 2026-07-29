import React from 'react';
import type {StyleProp, ViewStyle} from 'react-native';
import {StyleSheet, View} from 'react-native';
import Percentage from '../percentage/Percentage';
import {HIDDEN_BALANCE_MASK} from '../../utils/hideBalances';
import {useAppSelector} from '../../utils/hooks';

const styles = StyleSheet.create({
  percentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export type ChartChangeRowProps = {
  percent: number;
  deltaFiatFormatted?: string;
  rangeLabel?: string;
  style?: StyleProp<ViewStyle>;
  maskDeltaWhenBalancesHidden?: boolean;
};

const ChartChangeRow = ({
  percent,
  deltaFiatFormatted,
  rangeLabel,
  style,
  maskDeltaWhenBalancesHidden = false,
}: ChartChangeRowProps): React.ReactElement => {
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const displayedDelta =
    maskDeltaWhenBalancesHidden && hideAllBalances && deltaFiatFormatted
      ? HIDDEN_BALANCE_MASK
      : deltaFiatFormatted;

  return (
    <View style={[styles.percentRow, style]}>
      <Percentage
        percentageDifference={percent}
        hideArrow
        hideSign
        priceChange={displayedDelta}
        rangeLabel={rangeLabel}
        fractionDigits={2}
      />
    </View>
  );
};

export default ChartChangeRow;
