import React from 'react';
import styled from 'styled-components/native';
import LockSvg from '../../../../assets/img/lock.svg';
import {CARD_HEIGHT, CARD_WIDTH} from '../../../constants/config.card';
import {White} from '../../../styles/colors';
import CardOverlayBackground from './CardOverlayBackground';

const LockCardOverlayContainer = styled.View`
  height: ${CARD_HEIGHT}px;
  position: relative;
  width: ${CARD_WIDTH}px;
`;

const LockCardOverlayContent = styled.View`
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
`;

const LockText = styled.Text`
  color: ${White};
`;

const LockCardOverlay: React.FC = () => {
  return (
    <LockCardOverlayContainer>
      <CardOverlayBackground />

      <LockCardOverlayContent>
        <LockSvg />

        <LockText>Card is locked</LockText>
      </LockCardOverlayContent>
    </LockCardOverlayContainer>
  );
};

export default LockCardOverlay;
