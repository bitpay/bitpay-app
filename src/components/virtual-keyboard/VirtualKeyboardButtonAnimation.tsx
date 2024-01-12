import React from 'react';
import {View} from 'react-native';
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
import {VIRTUAL_KEYBOARD_BUTTON_SIZE} from './VirtualKeyboard';

interface RippleProps {
  onPress: () => void;
  backgroundColor?: string;
  onLongPress?: () => void;
  children: React.ReactNode;
}

const VirtualKeyboardButtonAnimation: React.FC<RippleProps> = ({
  onPress,
  backgroundColor,
  onLongPress,
  children,
}) => {
  onLongPress = onLongPress || onPress;
  const centerX = useSharedValue(0);
  const centerY = useSharedValue(0);
  const scale = useSharedValue(0);

  const rippleOpacity = useSharedValue(1);

  const tapGestureEvent =
    useAnimatedGestureHandler<TapGestureHandlerGestureEvent>({
      onStart: tapEvent => {
        centerX.value = VIRTUAL_KEYBOARD_BUTTON_SIZE / 2;
        centerY.value = VIRTUAL_KEYBOARD_BUTTON_SIZE / 2;

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
    const circleRadius = Math.sqrt(VIRTUAL_KEYBOARD_BUTTON_SIZE ** 3.2 * 2);

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
                height: VIRTUAL_KEYBOARD_BUTTON_SIZE,
                width: VIRTUAL_KEYBOARD_BUTTON_SIZE,
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
