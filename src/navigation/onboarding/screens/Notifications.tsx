import React from 'react';
import styled from 'styled-components/native';
import Notifications from '../../../../assets/img/onboarding/notifications.svg';
import {H3, Paragraph, TextAlign} from '../../../components/styled/Text';
import {
  CtaContainer,
  ImageContainer,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import {useDispatch} from 'react-redux';
import {AppActions} from '../../../store/app';
import haptic from '../../../components/haptic-feedback/haptic';
import {useNavigation} from '@react-navigation/native';

const NotificationsContainer = styled.SafeAreaView`
  flex: 1;
  align-items: center;
`;

const NotificationsScreen = () => {
  useAndroidBackHandler(() => true);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const onSetNotificationsPress = (notificationsAccepted: boolean) => {
    haptic('impactLight');
    dispatch(AppActions.setNotificationsAccepted(notificationsAccepted));
    navigation.navigate('Onboarding', {
      screen: 'Pin',
    });
  };

  return (
    <NotificationsContainer>
      <ImageContainer>
        <Notifications />
      </ImageContainer>
      <TitleContainer>
        <TextAlign align={'center'}>
          <H3>Turn on notifications</H3>
        </TextAlign>
      </TitleContainer>
      <TextContainer>
        <TextAlign align={'center'}>
          <Paragraph>
            Get important updates on your account, new features, promos and
            more. You can change this at any time in Settings.
          </Paragraph>
        </TextAlign>
      </TextContainer>
      <CtaContainer>
        <Button
          buttonStyle={'primary'}
          onPress={() => onSetNotificationsPress(true)}>
          Allow
        </Button>
        <Button
          buttonStyle={'secondary'}
          onPress={() => onSetNotificationsPress(false)}>
          Deny
        </Button>
      </CtaContainer>
    </NotificationsContainer>
  );
};

export default NotificationsScreen;
