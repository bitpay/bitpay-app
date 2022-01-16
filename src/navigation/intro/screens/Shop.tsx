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
import BottomTabBarShopSvg from '../../../../assets/img/intro/bottom-tabbar-shop.svg';
import {WIDTH} from '../../../components/styled/Containers';
import IntroButton from '../components/intro-button/IntroButton';
import {useNavigation} from '@react-navigation/native';

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
  background: white;
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
  return (
    <IntroShopContainer>
      <BackgroundImage
        source={require('../../../../assets/img/intro/light/balance-background.png')}
      />
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
        <BottomTabBarShopSvg width={WIDTH} />
      </BottomTabContainer>
    </IntroShopContainer>
  );
};

export default IntroShop;
