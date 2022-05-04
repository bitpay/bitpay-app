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
import {OnboardingImage} from '../components/Containers';
import {useNavigation} from '@react-navigation/native';
import haptic from '../../../components/haptic-feedback/haptic';
import {useDispatch} from 'react-redux';
import {AppActions} from '../../../store/app';
import TouchID from 'react-native-touch-id';
import {
  TO_HANDLE_ERRORS,
  BiometricError,
  BiometricErrorNotification,
  isSupportedOptionalConfigObject,
  authOptionalConfigObject,
} from '../../../constants/BiometricError';
import {showBottomNotificationModal} from '../../../store/app/app.actions';

const PinImage = require('../../../../assets/img/onboarding/pin.png');

const PinContainer = styled.SafeAreaView`
  flex: 1;
  align-items: center;
`;

const PinScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

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
                screen: 'CreateKey',
              });
            }}>
            Skip
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [navigation]);

  const onSetPinPress = () => {
    haptic('impactLight');
    dispatch(AppActions.showPinModal({type: 'set'}));
    navigation.navigate('Onboarding', {
      screen: 'CreateKey',
    });
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
        navigation.navigate('Onboarding', {
          screen: 'CreateKey',
        });
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

  useAndroidBackHandler(() => true);
  return (
    <PinContainer>
      <ImageContainer>
        <OnboardingImage style={{width: 160, height: 262}} source={PinImage} />
      </ImageContainer>
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
    </PinContainer>
  );
};

export default PinScreen;
