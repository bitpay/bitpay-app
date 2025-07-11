import React, {useMemo} from 'react';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import {BottomSheetBackdropProps} from '@gorhom/bottom-sheet';

export function createCustomBackdrop(
  backdropOpacity?: number,
  onClose?: (() => void) | undefined,
): React.FC<BottomSheetBackdropProps> {
  const CustomBackdrop = ({animatedIndex, style}: BottomSheetBackdropProps) => {
    const opacity = useAnimatedStyle(() => ({
      opacity: interpolate(
        animatedIndex.value, // current snap index
        [-1, 0], // input range
        [0, backdropOpacity ?? 0.4], // output range
        Extrapolation.CLAMP,
      ),
    }));

    const tapGesture = useMemo(
      () =>
        Gesture.Tap()
          .maxDuration(250)
          .onFinalize(() => {
            if (onClose) {
              runOnJS(onClose)();
            }
          }),
      [onClose],
    );

    const containerStyle = useMemo(
      () => [style, {backgroundColor: '#000'}, opacity],
      [style, opacity],
    );

    return (
      <GestureDetector gesture={tapGesture}>
        <Animated.View style={containerStyle} />
      </GestureDetector>
    );
  };
  return CustomBackdrop;
}
