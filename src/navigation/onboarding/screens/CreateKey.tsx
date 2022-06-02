import {StackScreenProps} from '@react-navigation/stack';
import React, {useLayoutEffect} from 'react';
import {ScrollView} from 'react-native';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import styled from 'styled-components/native';
import {OnboardingImage} from '../components/Containers';
import Button from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  ActionContainer,
  CtaContainer,
  HeaderRightContainer,
  ImageContainer,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/Containers';
import {H3, Paragraph, TextAlign} from '../../../components/styled/Text';
import {useThemeType} from '../../../utils/hooks/useThemeType';
import {OnboardingStackParamList} from '../OnboardingStack';

const CreateKeyContainer = styled.SafeAreaView`
  flex: 1;
  align-items: stretch;
`;
const KeyImage = {
  light: (
    <OnboardingImage
      style={{width: 212, height: 247}}
      source={require('../../../../assets/img/onboarding/light/create-wallet.png')}
    />
  ),
  dark: (
    <OnboardingImage
      style={{width: 189, height: 247}}
      source={require('../../../../assets/img/onboarding/dark/create-wallet.png')}
    />
  ),
};

const CreateOrImportKey: React.VFC<
  StackScreenProps<OnboardingStackParamList, 'CreateKey'>
> = ({navigation}) => {
  const themeType = useThemeType();
  useAndroidBackHandler(() => true);

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerLeft: () => null,
      headerRight: () => (
        <HeaderRightContainer>
          <Button
            buttonType={'pill'}
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('TermsOfUse', {
                context: 'TOUOnly',
              });
            }}>
            Skip
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [navigation]);

  return (
    <CreateKeyContainer>
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
        }}>
        <ImageContainer>{KeyImage[themeType]}</ImageContainer>
        <TitleContainer>
          <TextAlign align={'center'}>
            <H3>Create a key or import an existing key</H3>
          </TextAlign>
        </TitleContainer>
        <TextContainer>
          <TextAlign align={'center'}>
            <Paragraph>
              Store your assets safely and securely with BitPay's non-custodial
              app. Reminder: you own your keys, so be sure to have a pen and
              paper handy to write down your 12 words.
            </Paragraph>
          </TextAlign>
        </TextContainer>
        <CtaContainer>
          <ActionContainer>
            <Button
              buttonStyle={'primary'}
              onPress={() =>
                navigation.navigate('CurrencySelection', {
                  context: 'onboarding',
                })
              }>
              Create a Key
            </Button>
          </ActionContainer>
          <ActionContainer>
            <Button
              buttonStyle={'secondary'}
              onPress={() =>
                navigation.navigate('Import', {
                  context: 'onboarding',
                })
              }>
              I already have a Key
            </Button>
          </ActionContainer>
        </CtaContainer>
      </ScrollView>
    </CreateKeyContainer>
  );
};

export default CreateOrImportKey;
