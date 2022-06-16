import React from 'react';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import {CARD_HEIGHT, CARD_WIDTH} from '../../../constants/config.card';
import {White} from '../../../styles/colors';
import LockIcon from '../assets/settings/icon-lock.svg';
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
  const {t} = useTranslation();
  return (
    <LockCardOverlayContainer>
      <CardOverlayBackground />

      <LockCardOverlayContent>
        <LockIcon />

        <LockText>{t('Card is locked')}</LockText>
      </LockCardOverlayContent>
    </LockCardOverlayContainer>
  );
};

export default LockCardOverlay;
