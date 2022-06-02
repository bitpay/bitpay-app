import {StackScreenProps} from '@react-navigation/stack';
import React, {useLayoutEffect} from 'react';
import {ScrollView} from 'react-native';
import TouchID from 'react-native-touch-id';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  ActionContainer,
  CtaContainer,
  HeaderRightContainer,
  ImageContainer,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/Containers';
import {H3, Paragraph, TextAlign} from '../../../components/styled/Text';
import {
  TO_HANDLE_ERRORS,
  BiometricError,
  BiometricErrorNotification,
  isSupportedOptionalConfigObject,
  authOptionalConfigObject,
} from '../../../constants/BiometricError';
import {AppActions} from '../../../store/app';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {useAppDispatch} from '../../../utils/hooks';
import {useThemeType} from '../../../utils/hooks/useThemeType';
import {OnboardingStackParamList} from '../OnboardingStack';
import {OnboardingImage} from '../components/Containers';

const PinImage = {
  light: (
    <OnboardingImage
      style={{width: 180, height: 247}}
      source={require('../../../../assets/img/onboarding/light/pin.png')}
    />
  ),
  dark: (
    <OnboardingImage
      style={{width: 151, height: 247}}
      source={require('../../../../assets/img/onboarding/dark/pin.png')}
    />
  ),
};

const PinContainer = styled.SafeAreaView`
  flex: 1;
  align-items: stretch;
`;

const PinScreen: React.VFC<
  StackScreenProps<OnboardingStackParamList, 'Pin'>
> = ({navigation}) => {
  const dispatch = useAppDispatch();
  const themeType = useThemeType();

  useAndroidBackHandler(() => true);

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
              navigation.navigate('CreateKey');
            }}>
            Skip
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [navigation]);

  const onSetPinPress = () => {
    haptic('impactLight');
    dispatch(AppActions.showPinModal({type: 'set', context: 'onboarding'}));
  };

  const onSetBiometricPress = () => {
    haptic('impactLight');
    TouchID.isSupported(isSupportedOptionalConfigObject)
      .then(biometryType => {
        if (biometryType === 'FaceID') {
          console.log('FaceID is supported.');
        } else {
          console.log('TouchID is supported.');
        }
        return TouchID.authenticate(
          'Authentication Check',
          authOptionalConfigObject,
        );
      })
      .then(() => {
        dispatch(AppActions.biometricLockActive(true));
        navigation.navigate('CreateKey');
      })
      .catch((error: BiometricError) => {
        if (error.code && TO_HANDLE_ERRORS[error.code]) {
          const err = TO_HANDLE_ERRORS[error.code];
          dispatch(
            showBottomNotificationModal(BiometricErrorNotification(err)),
          );
        }
      });
  };

  return (
    <PinContainer>
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
        }}>
        <ImageContainer>{PinImage[themeType]}</ImageContainer>
        <TitleContainer>
          <TextAlign align={'center'}>
            <H3>Protect your wallet</H3>
          </TextAlign>
        </TitleContainer>
        <TextContainer>
          <TextAlign align={'center'}>
            <Paragraph>
              Set up an extra layer of security to keep your wallet secure.
            </Paragraph>
          </TextAlign>
        </TextContainer>
        <CtaContainer>
          <ActionContainer>
            <Button onPress={() => onSetPinPress()} buttonStyle={'primary'}>
              PIN
            </Button>
          </ActionContainer>
          <ActionContainer>
            <Button
              onPress={() => onSetBiometricPress()}
              buttonStyle={'secondary'}>
              Biometric
            </Button>
          </ActionContainer>
        </CtaContainer>
      </ScrollView>
    </PinContainer>
  );
};

export default PinScreen;
