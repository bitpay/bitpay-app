import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useLayoutEffect, useRef} from 'react';
import {Platform, ScrollView} from 'react-native';
import {requestNotifications, RESULTS} from 'react-native-permissions';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  ActionContainer,
  CtaContainer,
  HeaderRightContainer,
  HEIGHT,
  ImageContainer,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/Containers';
import {H3, Paragraph, TextAlign} from '../../../components/styled/Text';
import {AppEffects} from '../../../store/app';
import {
  useAppDispatch,
  useRequestTrackingPermissionHandler,
} from '../../../utils/hooks';
import {useThemeType} from '../../../utils/hooks/useThemeType';
import {OnboardingGroupParamList, OnboardingScreens} from '../OnboardingGroup';
import {OnboardingImage} from '../components/Containers';
import {useTranslation} from 'react-i18next';

const NotificationsContainer = styled.SafeAreaView`
  flex: 1;
  align-items: stretch;
`;

const NotificationImage = {
  light: (
    <OnboardingImage
      style={{width: 190, height: 178}}
      source={require('../../../../assets/img/onboarding/light/notifications.png')}
    />
  ),
  dark: (
    <OnboardingImage
      style={{width: 190, height: 170}}
      source={require('../../../../assets/img/onboarding/dark/notifications.png')}
    />
  ),
};

// estimated a number, tweak if neccessary based on the content length
const scrollEnabledForSmallScreens = HEIGHT < 600;

const NotificationsScreen = ({
  navigation,
}: NativeStackScreenProps<
  OnboardingGroupParamList,
  OnboardingScreens.NOTIFICATIONS
>) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const themeType = useThemeType();

  useAndroidBackHandler(() => true);

  const askForTrackingThenNavigate = useRequestTrackingPermissionHandler();

  const onSkipPressRef = useRef(async () => {
    haptic('impactLight');
    await askForTrackingThenNavigate(() => navigation.navigate('Pin'));
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerLeft: () => null,
      headerRight: () => (
        <HeaderRightContainer>
          <Button
            accessibilityLabel="skip-button"
            buttonType={'pill'}
            onPress={onSkipPressRef.current}>
            {t('Skip')}
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [navigation, t]);

  const onSetNotificationsPress = async (notificationsAccepted: boolean) => {
    const setAndNavigate = async (accepted: boolean) => {
      haptic('impactLight');
      const systemEnabled = await AppEffects.checkNotificationsPermissions();
      if (systemEnabled) {
        dispatch(AppEffects.setNotifications(accepted));
        dispatch(AppEffects.setConfirmTxNotifications(accepted));
        dispatch(AppEffects.setAnnouncementsNotifications(accepted));
      }
      await askForTrackingThenNavigate(() => navigation.navigate('Pin'));
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
    <NotificationsContainer accessibilityLabel="set-notifications-view">
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
        }}
        scrollEnabled={scrollEnabledForSmallScreens}>
        <ImageContainer justifyContent={'flex-end'}>
          {NotificationImage[themeType]}
        </ImageContainer>
        <TitleContainer>
          <TextAlign align={'center'}>
            <H3>{t('Turn on notifications')}</H3>
          </TextAlign>
        </TitleContainer>
        <TextContainer>
          <TextAlign align={'center'}>
            <Paragraph>
              {t(
                'Get important updates on your account, new features, promos and more. You can change this at any time in Settings.',
              )}
            </Paragraph>
          </TextAlign>
        </TextContainer>

        <CtaContainer accessibilityLabel="set-notifications-cta-container">
          <ActionContainer>
            <Button
              accessibilityLabel="allow-button"
              buttonStyle={'primary'}
              onPress={() => onSetNotificationsPress(true)}>
              {t('Allow')}
            </Button>
          </ActionContainer>
          <ActionContainer>
            <Button
              accessibilityLabel="deny-button"
              buttonStyle={'secondary'}
              onPress={() => onSetNotificationsPress(false)}>
              {t('Deny')}
            </Button>
          </ActionContainer>
        </CtaContainer>
      </ScrollView>
    </NotificationsContainer>
  );
};

export default NotificationsScreen;
