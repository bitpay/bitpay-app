import React from 'react';
import {PixelRatio, View} from 'react-native';
import {
  LongPressGestureHandler,
  TapGestureHandler,
  TapGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface RippleProps {
  onPress: () => void;
  backgroundColor?: string;
  onLongPress?: () => void;
  isSmallScreen?: boolean;
  children: React.ReactNode;
}

const VirtualKeyboardButtonAnimation: React.FC<RippleProps> = ({
  onPress,
  backgroundColor,
  onLongPress,
  isSmallScreen,
  children,
}) => {
  const virtualKeyboardButtonSize = isSmallScreen ? 60 : 85;
  onLongPress = onLongPress || onPress;
  const centerX = useSharedValue(0);
  const centerY = useSharedValue(0);
  const scale = useSharedValue(0);

  const rippleOpacity = useSharedValue(1);

  const tapGestureEvent =
    useAnimatedGestureHandler<TapGestureHandlerGestureEvent>({
      onStart: tapEvent => {
        centerX.value = virtualKeyboardButtonSize / 2;
        centerY.value = virtualKeyboardButtonSize / 2;

        rippleOpacity.value = 1;
        scale.value = 0;
        scale.value = withTiming(1, {duration: 550});
      },
      onActive: () => {
        if (onPress) {
          runOnJS(onPress)();
        }
      },
      onFinish: () => {
        rippleOpacity.value = withTiming(0);
      },
    });

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
    <LongPressGestureHandler
      minDurationMs={1000}
      onHandlerStateChange={({nativeEvent}) => {
        if (nativeEvent.state === State.ACTIVE) {
          onLongPress ? onLongPress() : onPress();
        }
      }}>
      <Animated.View>
        <TapGestureHandler onGestureEvent={tapGestureEvent}>
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
        </TapGestureHandler>
      </Animated.View>
    </LongPressGestureHandler>
  );
};

export default VirtualKeyboardButtonAnimation;
