import {StackScreenProps} from '@react-navigation/stack';
import React, {useLayoutEffect} from 'react';
import {ScrollView} from 'react-native';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {OnboardingImage} from '../components/Containers';
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
import {OnboardingStackParamList} from '../OnboardingStack';

const CreateKeyContainer = styled.SafeAreaView`
  flex: 1;
  align-items: stretch;
`;
const KeyImage = require('../../../../assets/img/onboarding/create-wallet.png');

const CreateOrImportKey: React.VFC<
  StackScreenProps<OnboardingStackParamList, 'CreateKey'>
> = ({navigation}) => {
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
        <ImageContainer>
          <OnboardingImage
            style={{width: 155, height: 247}}
            source={KeyImage}
          />
        </ImageContainer>
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
