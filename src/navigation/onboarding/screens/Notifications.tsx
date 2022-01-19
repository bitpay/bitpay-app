import React, {useLayoutEffect} from 'react';
import styled from 'styled-components/native';
import {H3, Paragraph, TextAlign} from '../../../components/styled/Text';
import {
  CtaContainer,
  HeaderRightContainer,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import {useDispatch} from 'react-redux';
import {AppActions} from '../../../store/app';
import haptic from '../../../components/haptic-feedback/haptic';
import {useNavigation} from '@react-navigation/native';
import {useThemeType} from '../../../utils/hooks/useThemeType';
import {OnboardingImage} from '../components/Containers';

const NotificationsContainer = styled.SafeAreaView`
  flex: 1;
  align-items: center;
`;

const NotificationImage = {
  light: require('../../../../assets/img/onboarding/light/notifications.png'),
  dark: require('../../../../assets/img/onboarding/dark/notifications.png'),
};

const NotificationsScreen = () => {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerLeft: () => null,
      headerRight: () => (
        <HeaderRightContainer>
          <Button
            buttonType={'pill'}
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('Onboarding', {
                screen: 'Pin',
              });
            }}>
            Skip
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [navigation]);

  useAndroidBackHandler(() => true);
  const themeType = useThemeType();
  const dispatch = useDispatch();
  const onSetNotificationsPress = (notificationsAccepted: boolean) => {
    haptic('impactLight');
    dispatch(AppActions.setNotificationsAccepted(notificationsAccepted));
    navigation.navigate('Onboarding', {
      screen: 'Pin',
    });
  };

  return (
    <NotificationsContainer>
      <OnboardingImage source={NotificationImage[themeType]} />
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
