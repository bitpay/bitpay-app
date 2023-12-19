import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {useTranslation} from 'react-i18next';
import styled, {useTheme} from 'styled-components/native';
import FocusedStatusBar from '../../../components/focused-status-bar/FocusedStatusBar';
import {TextContainer} from '../../../components/styled/Containers';
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
import {IntroStackParamList} from '../IntroStack';

const lightBackground = require('../../../../assets/img/intro/light/home-customize.png');
const darkBackground = require('../../../../assets/img/intro/dark/home-customize.png');

const HomeContainer = styled.View`
  flex: 1;
`;

type CustomizeHomeScreenProps = NativeStackScreenProps<
  IntroStackParamList,
  'CustomizeHome'
>;

const CustomizeHome: React.VFC<CustomizeHomeScreenProps> = ({navigation}) => {
  const {t} = useTranslation();
  const theme = useTheme();

  const onNext = async () => {
    navigation.navigate('Shop');
  };

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
    </HomeContainer>
  );
};

export default CustomizeHome;
