import React from 'react';
import styled from 'styled-components/native';
import {H3, Paragraph, TextAlign} from '../../../components/styled/Text';
import {
  CtaContainer,
  PngImage,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {useNavigation} from '@react-navigation/native';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import {useThemeType} from '../../../utils/hooks/useThemeType';

const CreateWalletContainer = styled.SafeAreaView`
  flex: 1;
  align-items: center;
`;

const CreateWalletImage = {
  light: require('../../../../assets/img/onboarding/light/create-wallet.png'),
  dark: require('../../../../assets/img/onboarding/dark/create-wallet.png'),
};

const CreateOrImportWallet = () => {
  useAndroidBackHandler(() => true);
  const navigation = useNavigation();
  const themeType = useThemeType();

  return (
    <CreateWalletContainer>
      <PngImage source={CreateWalletImage[themeType]} />
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
        <Button
          buttonStyle={'primary'}
          onPress={() =>
            navigation.navigate('Onboarding', {screen: 'SelectAssets'})
          }>
          Create a BitPay Wallet
        </Button>
        <Button
          buttonStyle={'secondary'}
          onPress={() =>
            navigation.navigate('Onboarding', {screen: 'ImportWallet'})
          }>
          I already have a wallet
        </Button>
      </CtaContainer>
    </CreateWalletContainer>
  );
};

export default CreateOrImportWallet;
