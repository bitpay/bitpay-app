import React, {memo} from 'react';
import {StyleSheet} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {G, Path} from 'react-native-svg';
import {Caution, ProgressBlue, Success} from '../../../styles/colors';

const styles = StyleSheet.create({
  spinner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderStyle: 'solid',
    borderLeftColor: 'rgba(255,255,255,.01)',
    borderRightColor: 'rgba(255,255,255,.01)',
    borderTopColor: ProgressBlue,
    borderBottomColor: ProgressBlue,
  },
});

export const LoadingIcon = memo(() => {
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
});

export const SuccessIcon = memo(() => (
  <Svg width="18" height="15" viewBox="0 0 18 15" fill="none">
    <Path
      fill={Success}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.50682 12.0639L2.24653 7.72917L0.639893 9.36387L5.69447 14.5067C5.92012 14.7363 6.22701 14.92 6.49779 14.92C6.76857 14.92 7.06643 14.7363 7.29208 14.5159L19.3599 2.17305L17.7713 0.519989L6.50682 12.0639Z"
    />
  </Svg>
));

export const FailedIcon = memo(() => (
  <Svg width="18" height="18" viewBox="0 0 18 18">
    <G
      id="Dashboard-(Mobile-Responsive)"
      stroke="none"
      strokeWidth="1"
      fill="none"
      fillRule="evenodd">
      <G
        id="Wallet/Small/Close-"
        transform="translate(2.65000000, 2.6500000)"
        fill={Caution}>
        <Path d="M12.0992857,0.900714286 C11.765,0.566428571 11.2635714,0.566428571 10.9292857,0.900714286 L6.5,5.33 L2.07071429,0.900714286 C1.73642857,0.566428571 1.235,0.566428571 0.900714286,0.900714286 C0.566428571,1.235 0.566428571,1.73642857 0.900714286,2.07071429 L5.33,6.5 L0.900714286,10.9292857 C0.566428571,11.2635714 0.566428571,11.765 0.900714286,12.0992857 C1.06785714,12.2664286 1.235,12.35 1.48571429,12.35 C1.73642857,12.35 1.90357143,12.2664286 2.07071429,12.0992857 L6.5,7.67 L10.9292857,12.0992857 C11.0964286,12.2664286 11.3471429,12.35 11.5142857,12.35 C11.6814286,12.35 11.9321429,12.2664286 12.0992857,12.0992857 C12.4335714,11.765 12.4335714,11.2635714 12.0992857,10.9292857 L7.67,6.5 L12.0992857,2.07071429 C12.4335714,1.73642857 12.4335714,1.235 12.0992857,0.900714286 Z" />
      </G>
    </G>
  </Svg>
));
