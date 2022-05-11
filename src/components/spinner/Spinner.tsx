import React, {memo} from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import SpinnerIcon from './spinner-icon.svg';

const DEFAULT_SIZE = 30;

type SpinnerProps = {
  size?: number;
};

const Spinner = (props: SpinnerProps) => {
  const size = Math.max(props.size || DEFAULT_SIZE, 0);

  const angle = useSharedValue(-90);
  angle.value = withRepeat(
    withTiming(630, {duration: 1500, easing: Easing.bezier(0.5, 0, 0.25, 1.2)}),
    -1,
    false,
  );

  const spin = useAnimatedStyle(() => ({
    transform: [{rotate: `${angle.value}deg`}],
  }));

  return (
    <Animated.View
      style={[
        {
          height: size,
          width: size,
        },
        spin,
      ]}>
      <SpinnerIcon height={'100%'} width={'100%'} />
    </Animated.View>
  );
};

export default memo(Spinner);
