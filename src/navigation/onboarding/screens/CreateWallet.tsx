import React from 'react';
import styled from 'styled-components/native';
import CreateWallet from '../../../../assets/img/onboarding/create-wallet.svg';
import {H3, Paragraph, TextAlign} from '../../../components/styled/text/Text';
import {
  CtaContainer,
  ImageContainer,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/containers/Containers';
import Button from '../../../components/button/Button';

const CreateWalletContainer = styled.SafeAreaView`
  flex: 1;
  align-items: center;
`;

const PinScreen = () => {
  return (
    <CreateWalletContainer>
      <ImageContainer>
        <CreateWallet />
      </ImageContainer>
      <TitleContainer>
        <TextAlign align={'center'}>
          <H3>Would you like to create or import a wallet?</H3>
        </TextAlign>
      </TitleContainer>
      <TextContainer>
        <TextAlign align={'center'}>
          <Paragraph>
            A wallet, formely known as a key, is a place where you store your
            assets.
          </Paragraph>
        </TextAlign>
      </TextContainer>
      <CtaContainer>
        <Button buttonStyle={'primary'}>Create a Wallet</Button>
        <Button buttonStyle={'secondary'}>I already have a wallet</Button>
      </CtaContainer>
    </CreateWalletContainer>
  );
};

export default PinScreen;
