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
import {StackScreenProps} from '@react-navigation/stack';
import {RootStackParamList} from '../../../Root';
import {useTheme} from 'styled-components/native';
import LightBottomTabBarContactsSvg from '../../../../assets/img/intro/light/bottom-tabbar-contacts.svg';
import DarkBottomTabBarContactsSvg from '../../../../assets/img/intro/dark/bottom-tabbar-contacts.svg';
import {askForTrackingPermissionAndEnableSdks} from '../../../store/app/app.effects';
import {useDispatch} from 'react-redux';
const lightBackground = require('../../../../assets/img/intro/light/contacts-background.png');
const darkBackground = require('../../../../assets/img/intro/dark/contacts-background.png');

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

const IntroContacts = ({navigation}: IntroContactsScreenProps) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  return (
    <IntroContactsContainer>
      <BackgroundImage source={theme.dark ? darkBackground : lightBackground} />
      <Overlay />
      <Body>
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
      <BottomTabContainer>
        <TextContainer>
          <IntroText>
            Send and receive from {'\n'} your friends in the
          </IntroText>
          <IntroTextBold>Contacts Tab.</IntroTextBold>
        </TextContainer>
        <BottomTabFill />
        {theme.dark ? (
          <DarkBottomTabBarContactsSvg width={WIDTH} />
        ) : (
          <LightBottomTabBarContactsSvg width={WIDTH} />
        )}
      </BottomTabContainer>
    </IntroContactsContainer>
  );
};

export default IntroContacts;
