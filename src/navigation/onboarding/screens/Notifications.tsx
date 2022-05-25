import React, {useLayoutEffect} from 'react';
import styled from 'styled-components/native';
import {H3, Paragraph, TextAlign} from '../../../components/styled/Text';
import {
  ActionContainer,
  CtaContainer,
  HeaderRightContainer,
  ImageContainer,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import {useDispatch} from 'react-redux';
import {AppEffects} from '../../../store/app';
import haptic from '../../../components/haptic-feedback/haptic';
import {useNavigation} from '@react-navigation/native';
import {OnboardingImage} from '../components/Containers';
import {requestNotifications, RESULTS} from 'react-native-permissions';
import {Platform} from 'react-native';

const NotificationsContainer = styled.SafeAreaView`
  flex: 1;
  align-items: center;
`;

const NotificationImage = require('../../../../assets/img/onboarding/notifications.png');

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
  const dispatch = useDispatch();

  const onSetNotificationsPress = async (notificationsAccepted: boolean) => {
    const setAndNavigate = (accepted: boolean) => {
      haptic('impactLight');
      dispatch(AppEffects.setNotifications(accepted));
      dispatch(AppEffects.setConfirmTxNotifications(accepted));
      dispatch(AppEffects.setProductsUpdatesNotifications(accepted));
      dispatch(AppEffects.setOffersAndPromotionsNotifications(accepted));
      navigation.navigate('Onboarding', {
        screen: 'Pin',
      });
    };

    if (!notificationsAccepted) {
      setAndNavigate(false);
      return;
    }

    if (Platform.OS === 'ios') {
      try {
        const {status: updatedStatus} = await requestNotifications([
          'alert',
          'badge',
          'sound',
        ]);
        setAndNavigate(updatedStatus === RESULTS.GRANTED);
        return;
      } catch (err) {
        console.error(err);
      }
    }

    setAndNavigate(true);
  };

  return (
    <NotificationsContainer>
      <ImageContainer justifyContent={'flex-end'}>
        <OnboardingImage
          style={{width: 182, height: 213}}
          source={NotificationImage}
        />
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
        <ActionContainer>
          <Button
            buttonStyle={'primary'}
            onPress={() => onSetNotificationsPress(true)}>
            Allow
          </Button>
        </ActionContainer>
        <ActionContainer>
          <Button
            buttonStyle={'secondary'}
            onPress={() => onSetNotificationsPress(false)}>
            Deny
          </Button>
        </ActionContainer>
      </CtaContainer>
    </NotificationsContainer>
  );
};

export default NotificationsScreen;
