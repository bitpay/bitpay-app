import React, {memo, PropsWithChildren, useCallback, useState} from 'react';
import {
  ColorValue,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {Action, Grey} from '../../styles/colors';

interface ProgressBarProps {
  color?: ColorValue | null | undefined;
  backgroundColor?: ColorValue | null | undefined;
  progress: number;
  renderIcon?: React.FC;
}

const BAR_HEIGHT = 4;
const BAR_BORDER_RADIUS = 15;

const styles = StyleSheet.create({
  progressContainer: {
    justifyContent: 'center',
    position: 'relative',
  },
  progressTrack: {
    backgroundColor: Grey,
    borderRadius: BAR_BORDER_RADIUS,
    height: BAR_HEIGHT,
    overflow: 'hidden',
    position: 'absolute',
    width: '100%',
  },
  progress: {
    backgroundColor: Action,
    height: '100%',
    left: '-100%',
    position: 'relative',
  },
  iconContainer: {
    alignItems: 'flex-end',
    left: '-100%',
    position: 'relative',
    width: '100%',
  },
});

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const calculateOffset = (percent: number, barWidth: number) => {
  const multiplier = clamp(percent, 0, 100) / 100;
  const offset = multiplier * barWidth;

  return offset;
};

const ProgressBar: React.FC<PropsWithChildren<ProgressBarProps>> = props => {
  // animated transforms can't use percentage, measure barWidth to calculate exact translate distance
  const [barWidth, setBarWidth] = useState(0);
  const [iconStyle, setIconStyle] = useState<StyleProp<ViewStyle>>({});

  const ProgressIcon = props.renderIcon;
  const {color = Action, backgroundColor = Grey} = props;
  const offset = barWidth ? calculateOffset(props.progress, barWidth) : 0;

  const animatedWidth = useSharedValue(0);
  animatedWidth.value = withTiming(offset, {
    duration: 200,
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: animatedWidth.value,
        },
      ],
    };
  });

  const onBarLayout = useCallback((e: LayoutChangeEvent) => {
    setBarWidth(Math.round(e.nativeEvent.layout.width));
  }, []);

  const onIconLayout = useCallback((e: LayoutChangeEvent) => {
    const width = Math.round(e.nativeEvent.layout.width);

    setIconStyle({
      transform: [
        {
          translateX: width / 2,
        },
      ],
    });
  }, []);

  return (
    <View style={styles.progressContainer} onLayout={onBarLayout}>
      <View
        style={[
          styles.progressTrack,
          backgroundColor ? {backgroundColor} : null,
        ]}>
        <Animated.View
          style={[
            styles.progress,
            animatedStyle,
            color ? {backgroundColor: color} : null,
          ]}
        />
      </View>

      {ProgressIcon ? (
        <Animated.View style={[styles.iconContainer, animatedStyle]}>
          <View style={iconStyle} onLayout={onIconLayout}>
            <ProgressIcon />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
};

export default memo(ProgressBar);
