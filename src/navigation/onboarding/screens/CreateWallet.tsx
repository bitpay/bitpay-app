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
  const goToImportWallet = () =>
    navigation.navigate('Onboarding', {screen: 'ImportWallet'});

  return (
    <CreateWalletContainer>
      <ImageContainer>
        <CreateWallet />
      </ImageContainer>
      <TitleContainer>
        <TextAlign align={'center'}>
          <H3>Create a new wallet or import an existing wallet</H3>
        </TextAlign>
      </TitleContainer>
      <TextContainer>
        <TextAlign align={'center'}>
          <Paragraph>
            Store your assets safely and securely with BitPay's non-custodial
            wallet. Reminder: you own your keys, so be sure to have a pen and
            paper handy to write down your 12 words.
          </Paragraph>
        </TextAlign>
      </TextContainer>
      <CtaContainer>
        <Button buttonStyle={'primary'} onPress={gotoSelectAssets}>
          Create a BitPay Wallet
        </Button>
        <Button buttonStyle={'secondary'} onPress={goToImportWallet}>
          I already have a wallet
        </Button>
      </CtaContainer>
    </CreateWalletContainer>
  );
};

export default PinScreen;
