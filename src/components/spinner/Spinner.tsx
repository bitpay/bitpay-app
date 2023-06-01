import React, {memo} from 'react';
// import Animated, {
//   Easing,
//   useAnimatedStyle,
//   useSharedValue,
//   withRepeat,
//   withTiming,
// } from 'react-native-reanimated';
import styled from 'styled-components/native';
import {Action, LightBlack} from '../../styles/colors';
import {BitPayB} from './Spinner.Icons';

const DEFAULT_SIZE = 30;

type SpinnerProps = {
  size?: number;
};

const SpinnerContainer = styled.View<{size: number}>`
  height: ${({size}) => size}px;
  justify-content: center;
  position: relative;
  width: ${({size}) => size}px;
`;

// const SpinnerRing = styled(Animated.View)<{size: number}>`
//   border: 3px solid ${({theme}) => (theme.dark ? LightBlack : '#f6f7f8')};
//   border-top-color: ${Action};
//   border-radius: ${({size}) => size}px;
//   height: 100%;
//   width: 100%;
// `;

const SpinnerIconContainer = styled.View`
  align-self: center;
  position: absolute;
`;

const Spinner = (props: SpinnerProps) => {
  const size = Math.max(props.size || DEFAULT_SIZE, 0);
  const scale = 0.5;
  const iconSize = scale * size;

  // const angle = useSharedValue(-45);
  // angle.value = withRepeat(
  //   withTiming(675, {duration: 1500, easing: Easing.bezier(0.5, 0, 0.25, 1.2)}),
  //   -1,
  //   false,
  // );

  // const spin = useAnimatedStyle(() => ({
  //   transform: [{rotate: `${angle.value}deg`}],
  // }));

  return (
    <></>
    // <SpinnerContainer size={size}>
    //   <SpinnerRing size={size} style={spin} />

    //   <SpinnerIconContainer>
    //     <BitPayB size={iconSize} />
    //   </SpinnerIconContainer>
    // </SpinnerContainer>
  );
};

export default memo(Spinner);
