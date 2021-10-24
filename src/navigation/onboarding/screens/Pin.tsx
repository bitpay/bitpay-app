import React from 'react';
import styled from 'styled-components/native';
import Pin from '../../../../assets/img/onboarding/pin.svg';
import {H3, Paragraph, TextAlign} from '../../../components/styled/text/Text';
import {
  CtaContainer,
  ImageContainer,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/containers/Containers';
import Button from '../../../components/button/Button';

const PinContainer = styled.SafeAreaView`
  flex: 1;
  align-items: center;
`;

const PinScreen = () => {
  return (
    <PinContainer>
      <ImageContainer>
        <Pin />
      </ImageContainer>
      <TitleContainer>
        <TextAlign align={'center'}>
          <H3>Set a PIN or use your fingerprint to unlock</H3>
        </TextAlign>
      </TitleContainer>
      <TextContainer>
        <TextAlign align={'center'}>
          <Paragraph>
            This adds an extra layer of security to your {'\n'} BitPay app.
          </Paragraph>
        </TextAlign>
      </TextContainer>
      <CtaContainer>
        <Button buttonStyle={'primary'}>PIN</Button>
        <Button buttonStyle={'secondary'}>Fingerprint</Button>
      </CtaContainer>
    </PinContainer>
  );
};

export default PinScreen;
