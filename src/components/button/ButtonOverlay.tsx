import React from 'react';
import {ColorValue, StyleSheet} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  ButtonStyle,
  ButtonType,
  BUTTON_RADIUS,
  DURATION,
  PILL_RADIUS,
} from './Button';

interface ButtonOverlayProps {
  isVisible: boolean;
  animate?: boolean;
  buttonStyle: ButtonStyle;
  buttonType: ButtonType;
  backgroundColor?: ColorValue;
  children?: React.ReactNode;
}

const ButtonOverlay: React.FC<ButtonOverlayProps> = props => {
  const {
    isVisible,
    backgroundColor,
    buttonStyle = 'primary',
    buttonType = 'button',
    animate,
    children,
  } = props;

  const isPrimary = buttonStyle === 'primary';

  const overlayOpacity = useSharedValue(0);
  overlayOpacity.set(
    withTiming(isVisible ? 1 : 0, {
      duration: 0,
      easing: Easing.linear,
    }),
  );

  const iconOpacity = useSharedValue(0);
  iconOpacity.set(
    withDelay(
      isVisible ? 0 : 0,
      withTiming(isVisible ? 1 : 0, {
        duration: DURATION,
        easing: Easing.linear,
      }),
    ),
  );

  const iconScale = useSharedValue(0.75);
  iconScale.set(
    animate
      ? withSequence(
          withTiming(1.25, {duration: DURATION, easing: Easing.linear}),
          withTiming(1, {duration: DURATION, easing: Easing.linear}),
        )
      : withTiming(1, {duration: DURATION, easing: Easing.linear}),
  );

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.get(),
    borderWidth: 2,
    borderStyle: 'solid',
    borderRadius: buttonType === 'pill' ? PILL_RADIUS : BUTTON_RADIUS,
    borderColor: backgroundColor || 'transparent',
    backgroundColor: (isPrimary && backgroundColor) || 'transparent',
  }));

  const iconStyle = [
    useAnimatedStyle(() => ({
      alignItems: 'center',
      display: 'flex',
      flexGrow: 1,
      justifyContent: 'center',
      opacity: iconOpacity.get(),
      transform: [{scale: iconScale.get()}],
    })),
  ];

  return (
    <Animated.View
      testID="button-overlay"
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, overlayAnimatedStyle]}>
      <Animated.View style={iconStyle}>{children}</Animated.View>
    </Animated.View>
  );
};

export default ButtonOverlay;
