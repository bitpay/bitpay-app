import React, {useEffect, useState} from 'react';
import styled from 'styled-components/native';
import {useNavigation, useTheme} from '@react-navigation/native';
import {
  BackgroundImage,
  Body,
  ButtonContainer,
  IntroText,
  Overlay,
  BodyContainer
} from '../components/styled/Styled';
const lightImage = require('../../../../assets/img/intro/light/whats-new.png');
const darkImage = require('../../../../assets/img/intro/dark/whats-new.png');
import Animated, {Easing, FadeIn} from 'react-native-reanimated';
import IntroButton from '../components/intro-button/IntroButton';
import FocusedStatusBar from '../../../components/focused-status-bar/FocusedStatusBar';

const IntroWhatsNewContainer = styled.View`
  flex: 1;
  background: ${({theme}) => theme.colors.background};
`;

const WhatsNew = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [delay, setDelay] = useState(0);

  useEffect(() => {
    setDelay(750);
  }, []);

  return (
    <IntroWhatsNewContainer>
      <FocusedStatusBar barStyle={'light-content'} />

      <BackgroundImage
        source={theme.dark ? darkImage : lightImage}
        resizeMode="contain"
      />
      {delay ? (
        <Animated.View
          entering={FadeIn.delay(delay).easing(Easing.linear)}
          style={{
            flex: 1,
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          }}>
          <Overlay />
          <Body>
            <BodyContainer>
              <IntroText>Here’s what’s new.</IntroText>
            </BodyContainer>
            <ButtonContainer>
              <IntroButton
                onPress={() => {
                  navigation.navigate('Intro', {screen: 'CustomizeHome'});
                }}
              />
            </ButtonContainer>
          </Body>
        </Animated.View>
      ) : null}
    </IntroWhatsNewContainer>
  );
};

export default WhatsNew;
