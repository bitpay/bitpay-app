import React, {useLayoutEffect} from 'react';
import styled from 'styled-components/native';
import {H3, Paragraph, TextAlign} from '../../../components/styled/Text';
import {
  CtaContainer,
  HeaderRightContainer,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import {useThemeType} from '../../../utils/hooks/useThemeType';
import {OnboardingImage} from '../components/Containers';
import {useNavigation} from '@react-navigation/native';
import haptic from '../../../components/haptic-feedback/haptic';

const PinImage = {
  light: require('../../../../assets/img/onboarding/light/pin.png'),
  dark: require('../../../../assets/img/onboarding/dark/pin.png'),
};

const PinContainer = styled.SafeAreaView`
  flex: 1;
  align-items: center;
`;

const PinScreen = () => {
  const navigation = useNavigation();

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
              navigation.navigate('Onboarding', {
                screen: 'CreateKey',
              });
            }}>
            Skip
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [navigation]);

  useAndroidBackHandler(() => true);
  const themeType = useThemeType();
  return (
    <PinContainer>
      <OnboardingImage source={PinImage[themeType]} />
      <TitleContainer>
        <TextAlign align={'center'}>
          <H3>Protect your wallet</H3>
        </TextAlign>
      </TitleContainer>
      <TextContainer>
        <TextAlign align={'center'}>
          <Paragraph>
            Set up an extra layer of security to keep your wallet secure.
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
