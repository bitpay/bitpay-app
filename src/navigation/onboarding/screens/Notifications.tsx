import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useLayoutEffect, useRef} from 'react';
import {ScrollView} from 'react-native';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  ActionContainer,
  CtaContainer,
  HeaderRightContainer,
  ImageContainer,
  isNarrowHeight,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/Containers';
import {H3, Paragraph, TextAlign} from '../../../components/styled/Text';
import {AppEffects} from '../../../store/app';
import {useAppDispatch} from '../../../utils/hooks';
import {useThemeType} from '../../../utils/hooks/useThemeType';
import {OnboardingGroupParamList, OnboardingScreens} from '../OnboardingGroup';
import {OnboardingImage} from '../components/Containers';
import {useTranslation} from 'react-i18next';
import {Analytics} from '../../../store/analytics/analytics.effects';

const NotificationsContainer = styled.SafeAreaView`
  flex: 1;
  align-items: stretch;
`;

const NotificationImage = {
  light: (
    <OnboardingImage
      style={{
        width: isNarrowHeight ? 127 : 190,
        height: isNarrowHeight ? 119 : 178,
      }}
      source={require('../../../../assets/img/onboarding/light/notifications.png')}
    />
  ),
  dark: (
    <OnboardingImage
      style={{
        width: isNarrowHeight ? 127 : 190,
        height: isNarrowHeight ? 119 : 178,
      }}
      source={require('../../../../assets/img/onboarding/dark/notifications.png')}
    />
  ),
};

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

  const onSkipPressRef = useRef(async () => {
    haptic('impactLight');
    dispatch(
      Analytics.track('Clicked Skip Notifications', {
        context: 'onboarding',
      }),
    );
    navigation.navigate('Pin');
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerLeft: () => null,
      headerRight: () => (
        <HeaderRightContainer>
          <Button
            testID="skip-button"
            accessibilityLabel="Skip"
            buttonType={'pill'}
            onPress={onSkipPressRef.current}>
            {t('Skip')}
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [navigation, t]);

  const onSetNotificationsPress = async (notificationsAccepted: boolean) => {
    const setAndNavigate = (accepted: boolean) => {
      haptic('impactLight');
      dispatch(AppEffects.setNotifications(accepted));
      if (notificationsAccepted) {
        dispatch(
          Analytics.track('Clicked Allow Notifications', {
            context: 'onboarding',
          }),
        );
      } else {
        dispatch(
          Analytics.track('Clicked Deny Notifications', {
            context: 'onboarding',
          }),
        );
      }
      navigation.navigate('Pin');
    };

    if (!notificationsAccepted) {
      setAndNavigate(false);
      return;
    }

    const accepted = await AppEffects.requestNotificationsPermissions();
    setAndNavigate(accepted);
  };

  return (
    <NotificationsContainer testID="set-notifications-view">
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
        }}
        scrollEnabled={isNarrowHeight}>
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

        <CtaContainer testID="set-notifications-cta-container">
          <ActionContainer>
            <Button
              testID="allow-button"
              accessibilityLabel="Allow notifications"
              buttonStyle={'primary'}
              onPress={() => onSetNotificationsPress(true)}>
              {t('Allow')}
            </Button>
          </ActionContainer>
          <ActionContainer>
            <Button
              testID="deny-button"
              accessibilityLabel="Deny notifications"
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
