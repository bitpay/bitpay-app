import React, {memo} from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../contexts';
import {Action, LightBlack} from '../../styles/colors';
import {BitPayB} from './Spinner.Icons';

const DEFAULT_SIZE = 30;

type SpinnerProps = {
  size?: number;
};

const styles = StyleSheet.create({
  spinnerContainer: {
    justifyContent: 'center',
    position: 'relative',
  },
  spinnerRing: {
    borderWidth: 3,
    height: '100%',
    width: '100%',
  },
  spinnerIconContainer: {
    alignSelf: 'center',
    position: 'absolute',
  },
});

const Spinner = (props: SpinnerProps) => {
  const theme = useTheme();
  const size = Math.max(props.size || DEFAULT_SIZE, 0);
  const scale = 0.5;
  const iconSize = scale * size;

  const angle = useSharedValue(-45);
  angle.value = withRepeat(
    withTiming(675, {duration: 1500, easing: Easing.bezier(0.5, 0, 0.25, 1.2)}),
    -1,
    false,
  );

  const spin = useAnimatedStyle(() => ({
    transform: [{rotate: `${angle.value}deg`}],
  }));

  return (
    <View style={[styles.spinnerContainer, {height: size, width: size}]}>
      <Animated.View
        style={[
          styles.spinnerRing,
          {
            borderColor: theme.dark ? LightBlack : '#f6f7f8',
            borderTopColor: Action,
            borderRadius: size,
          },
          spin,
        ]}
      />

      <View style={styles.spinnerIconContainer}>
        <BitPayB size={iconSize} />
      </View>
    </View>
  );
};

export default memo(Spinner);
