import React, {memo, PropsWithChildren, useCallback, useState} from 'react';
import {
  ColorValue,
  LayoutChangeEvent,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
// import Animated, {
//   useAnimatedStyle,
//   useSharedValue,
//   withTiming,
// } from 'react-native-reanimated';
import styled from 'styled-components/native';
import {Action, Grey} from '../../styles/colors';

interface ProgressBarProps {
  color?: ColorValue | null | undefined;
  backgroundColor?: ColorValue | null | undefined;
  progress: number;
  renderIcon?: React.FC;
}

const BAR_HEIGHT = 4;
const BAR_BORDER_RADIUS = 15;

const ProgressContainer = styled.View`
  justify-content: center;
  position: relative;
`;

const ProgressTrack = styled.View`
  background-color: ${Grey};
  border-radius: ${BAR_BORDER_RADIUS}px;
  height: ${BAR_HEIGHT}px;
  overflow: hidden;
  position: absolute;
  width: 100%;
`;

// const Progress = styled(Animated.View)`
//   background-color: ${Action};
//   height: 100%;
//   left: -100%;
//   position: relative;
// `;

// const IconContainer = styled(Animated.View)`
//   align-items: flex-end;
//   left: -100%;
//   position: relative;
//   width: 100%;
// `;

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

  // const animatedWidth = useSharedValue(0);
  // animatedWidth.value = withTiming(offset, {
  //   duration: 200,
  // });

  // const animatedStyle = useAnimatedStyle(() => {
  //   return {
  //     transform: [
  //       {
  //         translateX: animatedWidth.value,
  //       },
  //     ],
  //   };
  // });

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
    <ProgressContainer onLayout={onBarLayout}>
      {/* <ProgressTrack style={backgroundColor ? {backgroundColor} : null}>
        <Progress
          style={[animatedStyle, color ? {backgroundColor: color} : null]}
        />
      </ProgressTrack>

      {ProgressIcon ? (
        <IconContainer style={animatedStyle}>
          <View style={iconStyle} onLayout={onIconLayout}>
            <ProgressIcon />
          </View>
        </IconContainer>
      ) : null} */}
    </ProgressContainer>
  );
};

export default memo(ProgressBar);
