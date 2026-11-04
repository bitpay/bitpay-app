import React from 'react';
import type {StyleProp, ViewStyle} from 'react-native';
import {StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import Percentage from '../percentage/Percentage';
import {HIDDEN_BALANCE_MASK} from '../../utils/hideBalances';
import {useAppSelector} from '../../utils/hooks';
import {ZERO_BALANCE_AXIS_LABEL_FADE_MS} from './chartLayout';

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
  /**
   * When false the row keeps its space but is transparent. Changes fade over
   * ZERO_BALANCE_AXIS_LABEL_FADE_MS instead of toggling.
   */
  visible?: boolean;
};

const ChartChangeRow = ({
  percent,
  deltaFiatFormatted,
  rangeLabel,
  style,
  maskDeltaWhenBalancesHidden = false,
  visible = true,
}: ChartChangeRowProps): React.ReactElement => {
  const hideAllBalances = useAppSelector(({APP}) => APP.hideAllBalances);
  const displayedDelta =
    maskDeltaWhenBalancesHidden && hideAllBalances && deltaFiatFormatted
      ? HIDDEN_BALANCE_MASK
      : deltaFiatFormatted;
  const opacity = useDerivedValue(() =>
    withTiming(visible ? 1 : 0, {duration: ZERO_BALANCE_AXIS_LABEL_FADE_MS}),
  );
  const fadeStyle = useAnimatedStyle(() => ({opacity: opacity.value}));

  return (
    <Animated.View style={[styles.percentRow, style, fadeStyle]}>
      <Percentage
        percentageDifference={percent}
        hideArrow
        hideSign
        priceChange={displayedDelta}
        rangeLabel={rangeLabel}
        fractionDigits={2}
      />
    </Animated.View>
  );
};

export default ChartChangeRow;
