import React from 'react';
import {Animated} from 'react-native';
import styled from 'styled-components/native';
import {BaseText} from '../styled/Text';

interface PinMessagesProps {
  message: string;
}

const PinMessagesContainer = styled(Animated.View)`
  align-items: center;
  text-align: center;
  margin-top: 40%;
`;

const PinMessage = styled(BaseText)`
  font-weight: 500;
  font-size: 25px;
`;

const PinMessages: React.FC<PinMessagesProps> = ({
  message = 'Please enter your PIN',
}) => {
  return (
    <PinMessagesContainer>
      <PinMessage>{message}</PinMessage>
    </PinMessagesContainer>
  );
};

export default PinMessages;
