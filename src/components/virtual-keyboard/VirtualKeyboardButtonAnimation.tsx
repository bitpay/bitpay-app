import React from 'react';
import {View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {getKeyboardSizes, KeyboardSizesContext} from './VirtualKeyboard';

interface RippleProps {
  onPress: () => void;
  backgroundColor?: string;
  onLongPress?: () => void;
  isSmallScreen?: boolean;
  context?: KeyboardSizesContext;
  children: React.ReactNode;
}

const VirtualKeyboardButtonAnimation: React.FC<RippleProps> = ({
  onPress,
  backgroundColor,
  onLongPress,
  isSmallScreen,
  context,
  children,
}) => {
  const virtualKeyboardButtonSize = getKeyboardSizes(
    isSmallScreen,
    context,
  ).virtualKeyboardButtonSize;
  onLongPress = onLongPress || onPress;
  const centerX = useSharedValue(0);
  const centerY = useSharedValue(0);
  const scale = useSharedValue(0);

  const rippleOpacity = useSharedValue(1);

  const tap = Gesture.Tap()
    .onBegin(() => {
      centerX.value = virtualKeyboardButtonSize / 2;
      centerY.value = virtualKeyboardButtonSize / 2;

      rippleOpacity.value = 1;
      scale.value = 0;
      scale.value = withTiming(1, {duration: 550});
    })
    .onEnd(() => {
      if (onPress) {
        runOnJS(onPress)();
      }
    })
    .onFinalize(() => {
      rippleOpacity.value = withTiming(0);
    });

  const longPress = Gesture.LongPress()
    .minDuration(1000)
    .onStart(() => {
      runOnJS(onLongPress ? onLongPress : onPress)();
    });

  // Prefer long press over tap when both could recognize
  const composedGesture = Gesture.Exclusive(longPress, tap);

  const rStyle = useAnimatedStyle(() => {
    const circleRadius = Math.sqrt(virtualKeyboardButtonSize ** 3.2 * 2);

    const translateX = centerX.value - circleRadius;
    const translateY = centerY.value - circleRadius;

    return {
      width: circleRadius * 2,
      height: circleRadius * 2,
      borderRadius: circleRadius,
      opacity: rippleOpacity.value,
      backgroundColor,
      position: 'absolute',
      top: 0,
      left: 0,
      transform: [
        {translateX},
        {translateY},
        {
          scale: scale.value,
        },
      ],
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          {
            overflow: 'hidden',
            height: virtualKeyboardButtonSize,
            width: virtualKeyboardButtonSize,
            borderRadius: 50,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}>
        <View>{children}</View>
        <Animated.View style={rStyle} />
      </Animated.View>
    </GestureDetector>
  );
};

export default VirtualKeyboardButtonAnimation;
