import React from 'react';
import {ColorValue, StyleSheet, View} from 'react-native';
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

interface ButtonOverlayProps extends React.PropsWithChildren {
  isVisible: boolean;
  animate?: boolean;
  buttonStyle: ButtonStyle;
  buttonType: ButtonType;
  backgroundColor?: ColorValue;
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
  overlayOpacity.value = withTiming(isVisible ? 1 : 0, {
    duration: 0,
    easing: Easing.linear,
  });

  const iconOpacity = useSharedValue(0);
  iconOpacity.value = withDelay(
    isVisible ? 0 : 0,
    withTiming(isVisible ? 1 : 0, {duration: DURATION, easing: Easing.linear}),
  );

  const iconScale = useSharedValue(0.75);
  iconScale.value = animate
    ? withSequence(
        withTiming(1.25, {duration: DURATION, easing: Easing.linear}),
        withTiming(1, {duration: DURATION, easing: Easing.linear}),
      )
    : withTiming(1, {duration: DURATION, easing: Easing.linear});

  const overlayStyle = [
    StyleSheet.absoluteFillObject,
    useAnimatedStyle(() => ({
      opacity: overlayOpacity.value,
      borderWidth: 2,
      borderStyle: 'solid',
      borderRadius: buttonType === 'pill' ? PILL_RADIUS : BUTTON_RADIUS,
      borderColor: backgroundColor || 'transparent',
      backgroundColor: (isPrimary && backgroundColor) || 'transparent',
    })),
  ];

  const overlayStyleStatic = {
    ...StyleSheet.absoluteFillObject,
    ...{
      opacity: isVisible ? 1 : 0,
      borderWidth: 2,
      borderStyle: 'solid',
      borderRadius: buttonType === 'pill' ? PILL_RADIUS : BUTTON_RADIUS,
      borderColor: backgroundColor || 'transparent',
      backgroundColor: (isPrimary && backgroundColor) || 'transparent',
    }
  } as Record<string, any>;

  const iconStyle = [
    useAnimatedStyle(() => ({
      alignItems: 'center',
      display: 'flex',
      flexGrow: 1,
      justifyContent: 'center',
      opacity: iconOpacity.value,
      transform: [{scale: iconScale.value}],
    })),
  ];

  const iconStyleStatic = {
    opacity: isVisible ? 1 : 0,
    alignItems: 'center',
    display: 'flex',
    flexGrow: 1,
    justifyContent: 'center',
  } as Record<string, any>;

  return (
    <View style={overlayStyleStatic}>
      <View style={iconStyleStatic}>
        {children}
      </View>
    </View>
  );

  // return (
  //   <Animated.View style={overlayStyle}>
  //     <Animated.View style={iconStyle}>{children}</Animated.View>
  //   </Animated.View>
  // );
};

export default ButtonOverlay;
