import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {useTheme} from 'styled-components/native';
import FocusedStatusBar from '../../../components/focused-status-bar/FocusedStatusBar';
import {
  ScreenContainer,
  TextContainer,
} from '../../../components/styled/Containers';
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
import {IntroGroupParamList, IntroScreens} from '../IntroGroup';

const lightBackground = require('../../../../assets/img/intro/light/home-customize.png');
const darkBackground = require('../../../../assets/img/intro/dark/home-customize.png');

type CustomizeHomeScreenProps = NativeStackScreenProps<
  IntroGroupParamList,
  IntroScreens.CUSTOMIZE_HOME
>;

const CustomizeHome = ({navigation}: CustomizeHomeScreenProps) => {
  const {t} = useTranslation();
  const theme = useTheme();

  const onNext = async () => {
    navigation.navigate('Shop');
  };

  return (
    <ScreenContainer>
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
          <TextContainer style={{marginTop: 50}}>
            <IntroText>
              {t(
                'Customize your home view. Choose what you want to see and how you see it.',
              )}
            </IntroText>
          </TextContainer>
        </BodyContainer>

        <ButtonContainer>
          <IntroButton onPress={onNext} />
        </ButtonContainer>
      </Body>
    </ScreenContainer>
  );
};

export default CustomizeHome;
