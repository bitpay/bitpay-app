import {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {View} from 'react-native';
import styled from 'styled-components/native';
import {DarkTheme, DefaultTheme, useTheme} from '@react-navigation/native';
import FocusedStatusBar from '../../../components/focused-status-bar/FocusedStatusBar';
import IntroButton from '../components/intro-button/IntroButton';
import {
  BackgroundImage,
  Body,
  ButtonContainer,
  IntroText,
  Overlay,
  BodyContainer,
} from '../components/styled/Styled';
import {IntroStackParamList} from '../IntroStack';

const lightImage = require('../../../../assets/img/intro/light/whats-new.png');
const darkImage = require('../../../../assets/img/intro/dark/whats-new.png');

const IntroWhatsNewContainer = styled.View`
  flex: 1;
  background: ${({theme: dark}) =>
    dark ? DarkTheme.colors.background : DefaultTheme.colors.background};
`;

type WhatsNewScreenProps = StackScreenProps<IntroStackParamList, 'WhatsNew'>;

const WhatsNew: React.VFC<WhatsNewScreenProps> = ({navigation}) => {
  const {t} = useTranslation();
  const theme = useTheme();

  const onNext = () => {
    navigation.navigate('CustomizeHome');
  };

  return (
    <IntroWhatsNewContainer>
      <FocusedStatusBar barStyle={'light-content'} />

      <BackgroundImage
        source={theme.dark ? darkImage : lightImage}
        resizeMode="contain"
      />

      <Overlay />

      <Body>
        <View
          style={{
            flex: 1,
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          }}>
          <BodyContainer>
            <IntroText>{t("Here's what's new.")}</IntroText>
          </BodyContainer>
        </View>

        <ButtonContainer>
          <IntroButton onPress={onNext} />
        </ButtonContainer>
      </Body>
    </IntroWhatsNewContainer>
  );
};

export default WhatsNew;
