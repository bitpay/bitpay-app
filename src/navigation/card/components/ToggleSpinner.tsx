import React, {useEffect} from 'react';
import styled from 'styled-components/native';
// import Animated, {
//   Easing,
//   useAnimatedStyle,
//   useSharedValue,
//   withDelay,
//   withSequence,
//   withTiming,
// } from 'react-native-reanimated';
import {FailedIcon, LoadingIcon, SuccessIcon} from './ToggleSpinnerIcons';

export type ToggleSpinnerState =
  | 'success'
  | 'failed'
  | 'loading'
  | undefined
  | null;

interface ToggleSpinnerProps {
  state?: ToggleSpinnerState;
}

const ToggleSpinnerContainer = styled.View`
  height: 20px;
  width: 20px;
`;

// const IconWrapper = styled(Animated.View)`
//   height: 100%;
//   justify-content: center;
//   width: 100%;
// `;

// const PULSE = withDelay(
//   50,
//   withSequence(
//     withTiming(1.2, {
//       duration: 100,
//       easing: Easing.ease,
//     }),
//     withTiming(1, {
//       duration: 100,
//       easing: Easing.ease,
//     }),
//   ),
// );

const ToggleSpinner: React.FC<ToggleSpinnerProps> = ({state}) => {
  // const successScale = useSharedValue(1);
  // const successStyle = useAnimatedStyle(() => ({
  //   transform: [
  //     {
  //       scale: successScale.value,
  //     },
  //   ],
  // }));

  // const failedScale = useSharedValue(1);
  // const failedStyle = useAnimatedStyle(() => ({
  //   transform: [
  //     {
  //       scale: failedScale.value,
  //     },
  //   ],
  // }));

  // useEffect(() => {
  //   if (state === 'success') {
  //     successScale.value = PULSE;
  //   } else {
  //     successScale.value = 1;
  //   }

  //   if (state === 'failed') {
  //     failedScale.value = PULSE;
  //   } else {
  //     failedScale.value = 1;
  //   }
  // }, [state, failedScale, successScale]);

  return (
    <ToggleSpinnerContainer>
      {/* {state === 'loading' ? (
        <LoadingIcon />
      ) : state === 'success' ? (
        <IconWrapper style={successStyle}>
          <SuccessIcon />
        </IconWrapper>
      ) : state === 'failed' ? (
        <IconWrapper style={failedStyle}>
          <FailedIcon />
        </IconWrapper>
      ) : null} */}
    </ToggleSpinnerContainer>
  );
};

export default ToggleSpinner;
