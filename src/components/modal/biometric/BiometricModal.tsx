import Modal from 'react-native-modal';
import React, {useEffect, useState, useCallback, useMemo} from 'react';
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
import ReactNativeBiometrics from 'react-native-biometrics';
import {useTheme} from '../../../contexts';
import {BaseText} from '../../styled/Text';
import BitpaySvg from '../../../../assets/img/wallet/transactions/bitpay.svg';
import {
  Animated,
  NativeModules,
  DeviceEventEmitter,
  StyleSheet,
  View,
} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {LOCK_AUTHORIZED_TIME} from '../../../constants/Lock';
import {useTranslation} from 'react-i18next';
import {DeviceEmitterEvents} from '../../../constants/device-emitter-events';
import {useLogger} from '../../../utils/hooks';

const styles = StyleSheet.create({
  biometricContainer: {
    flex: 1,
  },
  biometricModalTitleContainer: {
    height: '50%',
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  biometricModalTitle: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 22,
  },
  biometricModalBottomContainer: {
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50%',
  },
  biometricModalImgContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    top: -40,
  },
  imgContainer: {
    height: 80,
    borderRadius: 50,
    width: 80,
  },
});

export interface BiometricModalConfig {
  onClose?: (checked?: boolean) => void;
}

const modalStyle = {margin: 0};

const BiometricModal: React.FC = React.memo(() => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const logger = useLogger();
  const theme = useTheme();
  const isVisible = useSelector(({APP}: RootState) => APP.showBiometricModal);
  const {onClose} =
    useSelector(({APP}: RootState) => APP.biometricModalConfig) || {};
  const [animation] = useState(() => new Animated.Value(0));
  const [isActive, setIsActive] = useState(false);

  const inputRange = useMemo(() => [0, 1], []);
  const outputRange = useMemo(() => [1, 1.2], []);

  const scale = useMemo(
    () => animation.interpolate({inputRange, outputRange}),
    [animation, inputRange, outputRange],
  );

  const pulse = useCallback(() => {
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
  }, [animation]);

  const rnBiometrics = useMemo(
    () =>
      new ReactNativeBiometrics({
        allowDeviceCredentials: true,
      }),
    [],
  );

  const authenticate = useCallback(async () => {
    try {
      setIsActive(true);
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
  }, [dispatch, logger, onClose, pulse, rnBiometrics, t]);

  useEffect(() => {
    if (isVisible && !isActive) {
      authenticate();
    }
  }, [isVisible, isActive, authenticate]);

  const transformStyle = useMemo(() => ({transform: [{scale}]}), [scale]);

  const unlockAppText = useMemo(() => t('Unlock App'), [t]);

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
        style={modalStyle}>
        <View
          style={[
            styles.biometricContainer,
            {backgroundColor: theme.dark ? Black : White},
          ]}>
          <View
            style={[
              styles.biometricModalTitleContainer,
              {
                backgroundColor: theme.dark ? LightBlack : NeutralSlate,
                borderBottomColor: theme.dark ? DisabledDark : Grey,
              },
            ]}>
            <BaseText style={styles.biometricModalTitle}>
              {unlockAppText}
            </BaseText>
          </View>
          <TouchableOpacity
            style={styles.biometricModalImgContainer}
            onPress={authenticate}>
            <Animated.View style={[styles.imgContainer, transformStyle]}>
              <BitpaySvg width={80} height={80} />
            </Animated.View>
          </TouchableOpacity>
          <View style={styles.biometricModalBottomContainer} />
        </View>
      </Modal>
    </View>
  );
});

export default BiometricModal;
