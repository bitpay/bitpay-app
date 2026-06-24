import React from 'react';
import {Circle, Group} from '@shopify/react-native-skia';
import type {SelectionDotProps} from 'react-native-graph';
import {
  useAnimatedReaction,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

// Shared selection dot renderer used by ExchangeRate and balance history charts
// so chart interactions keep the same animation and styling.
const ChartSelectionDot = ({
  isActive,
  color,
  circleX,
  circleY,
}: SelectionDotProps): React.ReactElement => {
  const outerRadius = useSharedValue(0);
  const innerRadius = useSharedValue(0);

  useAnimatedReaction(
    () => isActive.value,
    active => {
      outerRadius.value = withSpring(active ? 9 : 0, {
        mass: 1,
        stiffness: 1000,
        damping: 50,
        velocity: 0,
      });
      innerRadius.value = withSpring(active ? 4 : 0, {
        mass: 1,
        stiffness: 1000,
        damping: 50,
        velocity: 0,
      });
    },
    [innerRadius, outerRadius],
  );

  return (
    <Group>
      <Circle
        cx={circleX}
        cy={circleY}
        r={outerRadius}
        color={color}
        opacity={0.18}
      />
      <Circle cx={circleX} cy={circleY} r={innerRadius} color={color} />
    </Group>
  );
};

export default ChartSelectionDot;
