import React from 'react';
import type {StyleProp, ViewStyle} from 'react-native';
import {StyleSheet, View} from 'react-native';
import Percentage from '../percentage/Percentage';

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
};

const ChartChangeRow = ({
  percent,
  deltaFiatFormatted,
  rangeLabel,
  style,
}: ChartChangeRowProps): React.ReactElement => {
  return (
    <View style={[styles.percentRow, style]}>
      <Percentage
        percentageDifference={percent}
        hideArrow
        hideSign
        priceChange={deltaFiatFormatted}
        rangeLabel={rangeLabel}
        fractionDigits={2}
      />
    </View>
  );
};

export default ChartChangeRow;
