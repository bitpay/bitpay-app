import Modal from 'react-native-modal';
import React, {useEffect, useState} from 'react';
import {RootState} from '../../../store';
import {AppActions} from '../../../store/app';
import {useDispatch, useSelector} from 'react-redux';
import {
  LightBlack,
  Black,
  DisabledDark,
  Grey,
  NeutralSlate,
  White,
} from '../../../styles/colors';
import ReactNativeBiometrics, {BiometryTypes} from 'react-native-biometrics';
import styled from 'styled-components/native';
import {BaseText} from '../../styled/Text';
import BitpaySvg from '../../../../assets/img/wallet/transactions/bitpay.svg';
import {Animated, NativeModules, DeviceEventEmitter, View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {LOCK_AUTHORIZED_TIME} from '../../../constants/Lock';
import {useTranslation} from 'react-i18next';
import {DeviceEmitterEvents} from '../../../constants/device-emitter-events';
import {useLogger} from '../../../utils/hooks';

const BiometricContainer = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const BiometricModalTitleContainer = styled.View`
  height: 50%;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom-width: 1px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? DisabledDark : Grey)};
`;

const BiometricModalTitle = styled(BaseText)`
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 22px;
`;

const BiometricModalBottomContainer = styled.View`
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50%;
`;

const BiometricModalImgContainer = styled(TouchableOpacity)`
  display: flex;
  justify-content: center;
  align-items: center;
  top: -40px;
`;

const ImgContainer = styled(Animated.View)`
  height: 80px;
  border-radius: 50px;
  width: 80px;
`;

export interface BiometricModalConfig {
  onClose?: (checked?: boolean) => void;
}

const BiometricModal: React.FC = () => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const logger = useLogger();
  const isVisible = useSelector(({APP}: RootState) => APP.showBiometricModal);
  const {onClose} =
    useSelector(({APP}: RootState) => APP.biometricModalConfig) || {};
  const [animation, setAnimation] = useState(new Animated.Value(0));
  const inputRange = [0, 1];
  const outputRange = [1, 1.2];
  const scale = animation.interpolate({inputRange, outputRange});
  const [isActive, setIsActive] = useState(false);

  const pulse = () => {
    Animated.sequence([
      Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        pulse();
      }, 10000);
    });
  };

  const authenticate = async () => {
    try {
      setIsActive(true);
      const rnBiometrics = new ReactNativeBiometrics({
        allowDeviceCredentials: true,
      });
      const {success, error} = await rnBiometrics.simplePrompt({
        promptMessage: t('Verify your identity'),
      });
      if (success) {
        logger.debug('successful biometrics provided');
        const timeSinceBoot = await NativeModules.Timer.getRelativeTime();
        const authorizedUntil = Number(timeSinceBoot) + LOCK_AUTHORIZED_TIME;
        dispatch(AppActions.lockAuthorizedUntil(authorizedUntil));
        dispatch(AppActions.dismissBiometricModal());
        dispatch(AppActions.showBlur(false));
        onClose?.(true);
        DeviceEventEmitter.emit(DeviceEmitterEvents.APP_LOCK_MODAL_DISMISSED);
        setIsActive(false);
      } else {
        logger.warn(`Error providing biometrics: ${error}`);
        pulse();
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logger.warn(`Error providing biometrics: ${errMsg}`);
    }
  };

  useEffect(() => {
    if (isVisible && !isActive) {
      authenticate();
    }
  }, [isVisible]);

  return (
    <View>
      <Modal
        isVisible={isVisible}
        coverScreen={true}
        backdropTransitionOutTiming={0}
        hideModalContentWhileAnimating
        backdropOpacity={1}
        animationIn={'fadeInUp'}
        animationOut={'fadeOutDown'}
        useNativeDriverForBackdrop={true}
        useNativeDriver={true}
        style={{margin: 0}}>
        <BiometricContainer>
          <BiometricModalTitleContainer>
            <BiometricModalTitle>{t('Unlock App')}</BiometricModalTitle>
          </BiometricModalTitleContainer>
          <BiometricModalImgContainer onPress={() => authenticate()}>
            <ImgContainer style={{transform: [{scale}]}}>
              <BitpaySvg width={80} height={80} />
            </ImgContainer>
          </BiometricModalImgContainer>
          <BiometricModalBottomContainer />
        </BiometricContainer>
      </Modal>
    </View>
  );
};

export default BiometricModal;
