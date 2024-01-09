import React, {memo} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {NotificationPrimary, White} from '../../styles/colors';

const styles = StyleSheet.create({
  spinner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderStyle: 'solid',
    borderLeftColor: 'rgba(255,255,255,.01)',
    borderRightColor: 'rgba(255,255,255,.01)',
  },
  secondary: {
    borderTopColor: NotificationPrimary,
    borderBottomColor: NotificationPrimary,
  },
  default: {
    borderTopColor: White,
    borderBottomColor: White,
  },
});

const Spinner = ({buttonStyle}: {buttonStyle?: string}) => {
  const angle = useSharedValue(0);
  angle.value = withRepeat(
    withTiming(180, {duration: 250, easing: Easing.linear}),
    -1,
    false,
  );

  const spin = useAnimatedStyle(() => ({
    transform: [{rotate: `${angle.value}deg`}],
  }));

  return (
    <Animated.View
      style={[
        styles.spinner,
        spin,
        buttonStyle === 'secondary' ? styles.secondary : styles.default,
      ]}
    />
  );
};

export default memo(Spinner);
