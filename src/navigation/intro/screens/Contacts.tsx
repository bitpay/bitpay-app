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
import BottomTabBarContactsSvg from '../../../../assets/img/intro/bottom-tabbar-contacts.svg';
import {WIDTH} from '../../../components/styled/Containers';
import IntroButton from '../components/intro-button/IntroButton';
import {StackScreenProps} from '@react-navigation/stack';

import {RootStackParamList} from '../../../Root';
type IntroContactsScreenProps = StackScreenProps<RootStackParamList, 'Intro'>;
const IntroContactsContainer = styled.View`
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

const IntroContacts = ({navigation}: IntroContactsScreenProps) => {
  return (
    <IntroContactsContainer>
      <BackgroundImage
        source={require('../../../../assets/img/intro/light/contacts-background.png')}
      />
      <Overlay />
      <Body>
        <ButtonContainer>
          <IntroButton
            onPress={() => {
              navigation.replace('Onboarding', {screen: 'OnboardingStart'});
            }}>
            Finish
          </IntroButton>
        </ButtonContainer>
      </Body>
      <BottomTabContainer>
        <TextContainer>
          <IntroText>
            Send and receive from {'\n'} your friends in the
          </IntroText>
          <IntroTextBold>Contacts Tab.</IntroTextBold>
        </TextContainer>
        <BottomTabFill />
        <BottomTabBarContactsSvg width={WIDTH} />
      </BottomTabContainer>
    </IntroContactsContainer>
  );
};

export default IntroContacts;
