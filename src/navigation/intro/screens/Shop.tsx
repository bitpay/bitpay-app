import React, {useEffect, useState} from 'react';
import styled from 'styled-components/native';
import {
  Body,
  IntroText,
  IntroTextBold,
  ButtonContainer,
  BodyContainer,
  IntroBackgroundImage,
  TopNavFill,
  TopNavFillOverlay,
  Overlay,
} from '../components/styled/Styled';
import IntroButton from '../components/intro-button/IntroButton';
import {useTheme} from '@react-navigation/native';
import FocusedStatusBar from '../../../components/focused-status-bar/FocusedStatusBar';
const lightBackground = require('../../../../assets/img/intro/light/shop-background.png');
const darkBackground = require('../../../../assets/img/intro/dark/shop-background.png');
import Animated, {Easing, FadeIn} from 'react-native-reanimated';
import {askForTrackingPermissionAndEnableSdks} from '../../../store/app/app.effects';
import {useAppDispatch} from '../../../utils/hooks';
import {StackScreenProps} from '@react-navigation/stack';
import {RootStackParamList} from '../../../Root';
import {IntroAnimeDelay} from '../IntroStack';

const IntroShopContainer = styled.View`
  flex: 1;
`;

const TextContainer = styled.View`
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
`;

type IntroContactsScreenProps = StackScreenProps<RootStackParamList, 'Intro'>;

const IntroShop = ({navigation}: IntroContactsScreenProps) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const [delay, setDelay] = useState(0);

  useEffect(() => {
    setDelay(IntroAnimeDelay);
  }, []);

  return (
    <IntroShopContainer>
      <FocusedStatusBar barStyle={'light-content'} />
      <Overlay />
      <TopNavFill />
      <TopNavFillOverlay />

      <IntroBackgroundImage
        source={theme.dark ? darkBackground : lightBackground}
        resizeMode="contain"
      />
      <Body>
        <BodyContainer>
          {delay ? (
            <Animated.View
              entering={FadeIn.easing(Easing.linear)
                .duration(300)
                .delay(delay)}>
              <TextContainer>
                <IntroText>
                  Shop with crypto and {'\n'} buy gift cards in the
                </IntroText>
                <IntroTextBold>Shop Tab.</IntroTextBold>
              </TextContainer>
            </Animated.View>
          ) : null}
        </BodyContainer>
        <ButtonContainer>
          <IntroButton
            onPress={async () => {
              await dispatch(askForTrackingPermissionAndEnableSdks());
              navigation.replace('Onboarding', {screen: 'OnboardingStart'});
            }}>
            Finish
          </IntroButton>
        </ButtonContainer>
      </Body>
    </IntroShopContainer>
  );
};

export default IntroShop;
