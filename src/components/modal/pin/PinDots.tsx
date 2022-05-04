import React, {useState} from 'react';
import {Animated, Vibration} from 'react-native';
import styled, {css} from 'styled-components/native';
import {White} from '../../../styles/colors';

interface PinDotsProps {
  pin: Array<string | undefined>;
  pinLength: number;
  shakeDots: boolean;
  setShakeDots: (value: boolean) => void;
}

interface ContainerProps {
  isFilled: boolean;
}

const DotsContainer = styled.View`
  display: flex;
  justify-content: space-between;
  flex-direction: row;
  margin: 16px auto auto auto;
  max-width: 145px;
  width: 50%;
`;

const Dot = styled(Animated.View)<ContainerProps>`
  height: 18px;
  width: 18px;
  border-radius: 50px;
  border-width: 1.5px;
  border-color: ${White};
  ${({isFilled}) =>
    isFilled &&
    css`
      background-color: ${White};
    `};
`;

const PinDots: React.FC<PinDotsProps> = ({
  pin,
  pinLength,
  shakeDots,
  setShakeDots,
}) => {
  const [animation] = useState(new Animated.Value(0));

  const shake = () => {
    Animated.sequence([
      Animated.timing(animation, {
        toValue: 10,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: -10,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: 10,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: 0,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        setShakeDots(false);
      }, 500);
    });
  };

  if (shakeDots) {
    shake();
    Vibration.vibrate();
  }

  return (
    <DotsContainer>
      {Array.from({length: pinLength}).map((_, index) => {
        return (
          <Dot
            style={{transform: [{translateX: animation}]}}
            key={index}
            isFilled={index < pin.length}
          />
        );
      })}
    </DotsContainer>
  );
};

export default PinDots;
