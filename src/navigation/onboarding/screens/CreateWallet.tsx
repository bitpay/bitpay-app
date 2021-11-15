import React from 'react';
import styled from 'styled-components/native';
import CreateWallet from '../../../../assets/img/onboarding/create-wallet.svg';
import {H3, Paragraph, TextAlign} from '../../../components/styled/Text';
import {
  CtaContainer,
  ImageContainer,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {useNavigation} from '@react-navigation/native';
import {useAndroidBackHandler} from 'react-navigation-backhandler';

const CreateWalletContainer = styled.SafeAreaView`
  flex: 1;
  align-items: center;
`;

const PinScreen = () => {
  useAndroidBackHandler(() => true);
  const navigation = useNavigation();
  const gotoSelectAssets = () =>
    navigation.navigate('Onboarding', {screen: 'SelectAssets'});
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
            A wallet, formerly known as a key, is a place where you store your
            assets.
          </Paragraph>
        </TextAlign>
      </TextContainer>
      <CtaContainer>
        <Button buttonStyle={'primary'} onPress={gotoSelectAssets}>
          Create a Wallet
        </Button>
        <Button buttonStyle={'secondary'}>I already have a wallet</Button>
      </CtaContainer>
    </CreateWalletContainer>
  );
};

export default PinScreen;
