import React from 'react';
import styled from 'styled-components/native';
import {H3, Paragraph, TextAlign} from '../../../components/styled/Text';
import {
  CtaContainer,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {useNavigation} from '@react-navigation/native';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import {useThemeType} from '../../../utils/hooks/useThemeType';
import {OnboardingImage} from '../components/Containers';

const CreateKeyContainer = styled.SafeAreaView`
  flex: 1;
  align-items: center;
`;

const CreateKeyImage = {
  light: require('../../../../assets/img/onboarding/light/create-wallet.png'),
  dark: require('../../../../assets/img/onboarding/dark/create-wallet.png'),
};

const CreateOrImportKey = () => {
  useAndroidBackHandler(() => true);
  const navigation = useNavigation();
  const themeType = useThemeType();

  return (
    <CreateKeyContainer>
      <OnboardingImage source={CreateKeyImage[themeType]} />
      <TitleContainer>
        <TextAlign align={'center'}>
          <H3>Create a key or import an existing key</H3>
        </TextAlign>
      </TitleContainer>
      <TextContainer>
        <TextAlign align={'center'}>
          <Paragraph>
            Store your assets safely and securely with BitPay's non-custodial
            app. Reminder: you own your keys, so be sure to have a pen and paper
            handy to write down your 12 words.
          </Paragraph>
        </TextAlign>
      </TextContainer>
      <CtaContainer>
        <Button
          buttonStyle={'primary'}
          onPress={() =>
            navigation.navigate('Onboarding', {screen: 'CurrencySelection'})
          }>
          Create a Key
        </Button>
        <Button
          buttonStyle={'secondary'}
          onPress={() =>
            navigation.navigate('Onboarding', {
              screen: 'Import',
              params: {isOnboarding: true},
            })
          }>
          I already have a Key
        </Button>
      </CtaContainer>
    </CreateKeyContainer>
  );
};

export default CreateOrImportKey;
