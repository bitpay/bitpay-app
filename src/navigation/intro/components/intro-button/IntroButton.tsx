import React from 'react';
import styled from 'styled-components/native';
import {H4} from '../../../../components/styled/Text';
import ArrowRightSvg from '../../../../../assets/img/intro/arrow-right.svg';
import {Action} from '../../../../styles/colors';
import haptic from '../../../../components/haptic-feedback/haptic';
import {ActiveOpacity} from '../../../../components/styled/Containers';
import {TouchableOpacity} from 'react-native-gesture-handler';

const IntroButtonContainer = styled(TouchableOpacity)`
  background: ${Action};
  border-radius: 50px;
`;

const ButtonText = styled(H4)`
  color: white;
  margin-right: 10px;
`;

const Row = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
`;

interface Props {
  onPress: () => void;
  children?: string;
}

const IntroButton = ({onPress, children = 'Next'}: Props) => {
  return (
    <IntroButtonContainer
      activeOpacity={ActiveOpacity}
      onPress={() => {
        haptic('impactLight');
        onPress();
      }}>
      <Row>
        <ButtonText>{children}</ButtonText>
        <ArrowRightSvg />
      </Row>
    </IntroButtonContainer>
  );
};

export default IntroButton;
