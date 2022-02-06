import React from 'react';
import styled from 'styled-components/native';
import {
  BackgroundImage,
  Body,
  IntroText,
  IntroTextBold,
  ButtonContainer,
  Overlay,
} from '../components/styled/Styled';
import {WIDTH} from '../../../components/styled/Containers';
import IntroButton from '../components/intro-button/IntroButton';
import {useNavigation, useTheme} from '@react-navigation/native';
import LightBottomTabBarShopSvg from '../../../../assets/img/intro/light/bottom-tabbar-shop.svg';
import DarkBottomTabBarShopSvg from '../../../../assets/img/intro/dark/bottom-tabbar-shop.svg';
const lightBackground = require('../../../../assets/img/intro/light/shop-background.png');
const darkBackground = require('../../../../assets/img/intro/dark/shop-background.png');

const IntroShopContainer = styled.View`
  flex: 1;
  position: relative;
`;

const BottomTabContainer = styled.View`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
`;

const BottomTabFill = styled.View`
  background: ${({theme}) => theme.colors.background};
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 70px;
`;

const TextContainer = styled.View`
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
`;

const IntroShop = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  return (
    <IntroShopContainer>
      <BackgroundImage source={theme.dark ? darkBackground : lightBackground} />
      <Overlay />
      <Body>
        <ButtonContainer>
          <IntroButton
            onPress={() => {
              navigation.navigate('Intro', {screen: 'Contacts'});
            }}
          />
        </ButtonContainer>
      </Body>
      <BottomTabContainer>
        <TextContainer>
          <IntroText>
            Shop with crypto and {'\n'} buy gift cards in the
          </IntroText>
          <IntroTextBold>Shop Tab.</IntroTextBold>
        </TextContainer>
        <BottomTabFill />
        {theme.dark ? (
          <DarkBottomTabBarShopSvg width={WIDTH} />
        ) : (
          <LightBottomTabBarShopSvg width={WIDTH} />
        )}
      </BottomTabContainer>
    </IntroShopContainer>
  );
};

export default IntroShop;
