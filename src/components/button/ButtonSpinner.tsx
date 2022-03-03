import React, {memo} from 'react';
import {StyleSheet} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {White} from '../../styles/colors';

const styles = StyleSheet.create({
  spinner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderStyle: 'solid',
    borderTopColor: White,
    borderBottomColor: White,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});

const Spinner = () => {
  const angle = useSharedValue(0);
  angle.value = withRepeat(
    withTiming(180, {duration: 250, easing: Easing.linear}),
    -1,
    false,
  );

  const spin = useAnimatedStyle(() => ({
    transform: [{rotate: `${angle.value}deg`}],
  }));

  return <Animated.View style={[styles.spinner, spin]} />;
};

export default memo(Spinner);
