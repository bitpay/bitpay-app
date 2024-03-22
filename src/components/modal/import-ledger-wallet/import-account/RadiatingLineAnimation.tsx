import React, {useEffect} from 'react';
import {StyleSheet, Dimensions, View} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {IconRow} from '../../import-ledger-wallet/import-ledger-wallet.styled';
import {SvgProps} from 'react-native-svg';

interface RadiatingLineAnimationProps {
  icon: React.FC<SvgProps>;
  height: number;
  width: number;
}

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

const RadiatingLineAnimation: React.FC<RadiatingLineAnimationProps> = ({
  icon,
  height,
  width,
}) => {
  const scale = useSharedValue(0);

  useEffect(() => {
    const repeatAnimation = () => {
      scale.value = withSequence(
        withTiming(1, {duration: 0}),
        withRepeat(
          withTiming(Math.sqrt(screenWidth ** 2 + screenHeight ** 2) / 200, {
            duration: 2000,
            easing: Easing.linear,
          }),
          -1,
          false,
        ),
        withTiming(0, {duration: 10}),
      );
    };

    repeatAnimation();
  }, [scale]);

  const circles = Array.from({length: 3}).map((_, index) => {
    const circleStyle = useAnimatedStyle(() => ({
      position: 'absolute',
      top: 30,
      left: 30,
      width: 20 + index * 10,
      height: 20 + index * 10,
      borderRadius: 10 + index * 5,
      borderWidth: 1,
      borderColor: '#CDE1F4',
      backgroundColor: 'transparent',
      transform: [
        {translateX: -(10 + index * 5)},
        {translateY: -(10 + index * 5)},
        {scale: scale.value},
      ],
      opacity: scale.value === 0 ? 0 : 0.1,
    }));

    return (
      <Animated.View
        key={index}
        style={[StyleSheet.absoluteFillObject, circleStyle]}
      />
    );
  });

  return (
    <IconRow>
      <View>
        {circles}
        {icon({height, width})}
      </View>
    </IconRow>
  );
};

export default RadiatingLineAnimation;
