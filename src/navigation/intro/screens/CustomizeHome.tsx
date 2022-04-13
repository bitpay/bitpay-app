import React, {useEffect, useState} from 'react';
import IntroButton from '../components/intro-button/IntroButton';
import {
  Body,
  BodyContainer,
  ButtonContainer,
  IntroBackgroundImage,
  IntroText,
  Overlay,
  TopNavFill,
  TopNavFillOverlay,
} from '../components/styled/Styled';
import {useNavigation, useTheme} from '@react-navigation/native';
import styled from 'styled-components/native';
const lightBackground = require('../../../../assets/img/intro/light/home-customize.png');
const darkBackground = require('../../../../assets/img/intro/dark/home-customize.png');
import Animated, {Easing, FadeIn} from 'react-native-reanimated';
import FocusedStatusBar from '../../../components/focused-status-bar/FocusedStatusBar';
import {TextContainer} from '../../../components/styled/Containers';

const HomeContainer = styled.View`
  flex: 1;
`;

const CustomizeHome = () => {
  const navigation = useNavigation();
  const theme = useTheme();

  const [delay, setDelay] = useState(0);

  useEffect(() => {
    setDelay(200);
  }, []);

  return (
    <HomeContainer>
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
          <TextContainer style={{marginTop: 20}}>
            {delay ? (
              <Animated.View
                entering={FadeIn.easing(Easing.linear)
                  .duration(300)
                  .delay(delay)}>
                <IntroText>
                  Customize your home view. Choose what you want to see and how
                  you see it.
                </IntroText>
              </Animated.View>
            ) : null}
          </TextContainer>
        </BodyContainer>
        <ButtonContainer>
          <IntroButton
            onPress={() => {
              navigation.navigate('Intro', {screen: 'Shop'});
            }}
          />
        </ButtonContainer>
      </Body>
    </HomeContainer>
  );
};

export default CustomizeHome;
