import {navigationRef} from '../../../Root';
import isEqual from 'lodash.isequal';
import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {shallowEqual} from 'react-redux';
import {useTranslation} from 'react-i18next';
import {
  Animated,
  DeviceEventEmitter,
  StyleSheet,
  View,
  NativeModules,
} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {gestureHandlerRootHOC} from 'react-native-gesture-handler';
import BitPayLogo from '../../../../assets/img/logos/bitpay-white.svg';
import VirtualKeyboard from '../../../components/virtual-keyboard/VirtualKeyboard';
import {DeviceEmitterEvents} from '../../../constants/device-emitter-events';
import {LOCK_AUTHORIZED_TIME} from '../../../constants/Lock';
import {AppActions} from '../../../store/app';
import {BitPay, Warning75, White} from '../../../styles/colors';
import {sleep} from '../../../utils/helper-methods';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import Back from '../../back/Back';
import haptic from '../../haptic-feedback/haptic';
import {ActiveOpacity} from '../../styled/Containers';
import {H5, H7} from '../../styled/Text';
import SheetModal from '../base/sheet/SheetModal';
import useModalContentLifecycle from '../base/useModalContentLifecycle';
import PinDots from './PinDots';
import {verifyAndMigratePin, createPin, PIN_CONFIG} from '../../../utils/pin';

export interface PinModalConfig {
  type: 'set' | 'check';
  context?: 'onboarding';
  onClose?: (checked?: boolean) => void;
}

const styles = StyleSheet.create({
  pinContainer: {
    flex: 1,
    backgroundColor: BitPay,
  },
  upperContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  pinMessagesContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  pinMessage: {
    color: White,
    lineHeight: 25,
  },
  pinMessagesErrorContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginRight: 25,
    marginBottom: 16,
    marginLeft: 25,
  },
  pinMessageError: {
    color: Warning75,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '600',
  },
  virtualKeyboardContainer: {
    marginBottom: '5%',
    paddingBottom: 10,
  },
  sheetHeaderContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});

const headerStyle = {paddingLeft: 25};

const Pin = gestureHandlerRootHOC(
  React.memo(() => {
    const {t} = useTranslation();
    const logger = useLogger();
    const dispatch = useAppDispatch();
    const {type, context, onClose} =
      useAppSelector(({APP}) => APP.pinModalConfig, shallowEqual) || {};
    const [pinStatus, setPinStatus] = useState<{
      pin: Array<string | undefined>;
      firstPinEntered: Array<string | undefined>;
    }>({pin: [], firstPinEntered: []});
    const [message, setMessage] = useState<string>(t('Please enter your PIN'));
    const [messageError, setMessageError] = useState<string | null>(null);
    const [shakeDots, setShakeDots] = useState(false);
    const [showBackButton, setShowBackButton] = useState<boolean>();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (type === 'set' || onClose) {
        setShowBackButton(true);
      }
      // fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, [type, onClose, fadeAnim]);

    // checkPin
    const currentPin = useAppSelector(({APP}) => APP.currentPin);
    const currentSalt = useAppSelector(({APP}) => APP.currentSalt);
    const pinBannedUntil = useAppSelector(({APP}) => APP.pinBannedUntil);
    const [attempts, setAttempts] = useState<number>(0);

    const reset = useCallback(() => {
      setMessage(t('Please enter your PIN'));
      setPinStatus({pin: [], firstPinEntered: []});
      setAttempts(0);
    }, [setMessage, setAttempts, setPinStatus, t]);

    const checkPin = useCallback(
      async (pinToCheck: Array<string>) => {
        try {
          const result = verifyAndMigratePin(
            pinToCheck,
            currentPin,
            currentSalt, // from storage (undefined for legacy users)
          );

          if (!result.isValid) {
            setShakeDots(true);
            setMessage(t('Incorrect PIN, try again'));
            setPinStatus({pin: [], firstPinEntered: []});
            setAttempts(_attempts => _attempts + 1); // Incorrect increment attempts
            return;
          }

          // Correct PIN
          if (result.needsMigration) {
            // Legacy user - save the new salt and hash
            dispatch(AppActions.currentPin(result.hashedPin));
            dispatch(AppActions.currentSalt(result.salt));
            logger.debug('PIN migrated to secure hash');
          }

          dispatch(AppActions.showBlur(false));
          const timeSinceBoot = await NativeModules.Timer.getRelativeTime();
          const authorizedUntil = Number(timeSinceBoot) + LOCK_AUTHORIZED_TIME;
          dispatch(AppActions.lockAuthorizedUntil(authorizedUntil));
          dispatch(AppActions.dismissPinModal()); // Correct PIN dismiss modal
          reset();
          onClose?.(true);
          DeviceEventEmitter.emit(DeviceEmitterEvents.APP_LOCK_MODAL_DISMISSED);
        } catch (err) {
          const errStr =
            err instanceof Error ? err.message : JSON.stringify(err);
          logger.error(`checkPin error: ${errStr}`);
        }
      },
      [currentPin, currentSalt, dispatch, logger, onClose, reset, t],
    );
    const checkPinRef = useRef(checkPin);
    checkPinRef.current = checkPin;

    const gotoCreateKey = useCallback(async () => {
      dispatch(AppActions.dismissPinModal());
      await sleep(10);
      navigationRef.navigate('CreateKey' as any);
    }, [dispatch]);

    const gotoCreateKeyRef = useRef(gotoCreateKey);
    gotoCreateKeyRef.current = gotoCreateKey;

    const setCurrentPin = useCallback(
      async (newPin: {firstPinEntered: Array<string>; pin: Array<string>}) => {
        try {
          if (isEqual(newPin.firstPinEntered, newPin.pin)) {
            const {hashedPin, salt} = createPin(newPin.pin);
            dispatch(AppActions.pinLockActive(true));
            dispatch(AppActions.currentPin(hashedPin));
            dispatch(AppActions.currentSalt(salt));
            dispatch(AppActions.showBlur(false));
            const timeSinceBoot = await NativeModules.Timer.getRelativeTime();
            const authorizedUntil =
              Number(timeSinceBoot) + LOCK_AUTHORIZED_TIME;
            dispatch(AppActions.lockAuthorizedUntil(authorizedUntil));

            if (context === 'onboarding') {
              dispatch(AppActions.setPinInteractionDone());
              gotoCreateKeyRef.current();
            } else {
              dispatch(AppActions.dismissPinModal());
            }
          } else {
            setShakeDots(true);
            reset();
          }
        } catch (err) {
          const errStr =
            err instanceof Error ? err.message : JSON.stringify(err);
          logger.error(`setCurrentPin error: ${err}`);
          setMessageError(errStr);
          reset();
          setShakeDots(true);
        }
      },
      [context, dispatch, logger, reset],
    );
    const setCurrentPinRef = useRef(setCurrentPin);
    setCurrentPinRef.current = setCurrentPin;
    const typeRef = useRef(type);
    typeRef.current = type;
    const translateRef = useRef(t);
    translateRef.current = t;

    const handleCellPress = useCallback(
      (value: string) => {
        if (pinBannedUntil) {
          // banned wait for entering new pin
          return;
        }
        setMessageError(null);
        haptic('soft');
        switch (value) {
          case 'reset':
            reset();
            break;
          case 'backspace':
            setPinStatus(prevValue => {
              const newPin = prevValue.pin.slice();
              newPin.splice(-1);
              return {...prevValue, pin: newPin};
            });
            break;
          default:
            // Adding new PIN
            setPinStatus(prevValue => {
              if (
                Number(value) >= PIN_CONFIG.PIN_MIN_VALUE &&
                Number(value) <= PIN_CONFIG.PIN_MAX_VALUE &&
                prevValue.pin.length < PIN_CONFIG.PIN_LENGTH
              ) {
                const newPin = prevValue.pin.slice();
                newPin[newPin.length] = value;
                return {...prevValue, pin: newPin};
              } else {
                return prevValue;
              }
            });
            break;
        }
      },
      [pinBannedUntil, reset],
    );

    useEffect(() => {
      const onCellPress = async () => {
        if (pinStatus.pin.length !== PIN_CONFIG.PIN_LENGTH) {
          // Waiting for more PIN digits
          return;
        }
        // Give some time for dot to fill
        await sleep(0);
        if (typeRef.current === 'set') {
          if (pinStatus.firstPinEntered.length) {
            setCurrentPinRef.current(
              pinStatus as {firstPinEntered: Array<string>; pin: Array<string>},
            );
          } else {
            setMessage(translateRef.current('Confirm your PIN'));
            setPinStatus({pin: [], firstPinEntered: pinStatus.pin});
          }
        } else {
          checkPinRef.current(pinStatus.pin as Array<string>);
        }
      };
      onCellPress();
    }, [pinStatus]);

    const setCountDown = useCallback(
      (bannedUntil: number, timeSinceBoot: number, count: number = 0) => {
        const intervalId = setInterval(() => {
          count = count + 1;
          const totalSecs = bannedUntil - timeSinceBoot - count;

          if (totalSecs < 0) {
            dispatch(AppActions.pinBannedUntil(undefined));
            clearInterval(intervalId);
            reset();
            return;
          }

          const m = Math.floor(totalSecs / 60);
          const s = totalSecs % 60;
          setMessage(
            t('Try again in ', {
              time: ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2),
            }),
          );
        }, 1000);
        return intervalId;
      },
      [dispatch, reset, t],
    );

    useEffect(() => {
      const checkAttempts = async () => {
        try {
          if (attempts === PIN_CONFIG.ATTEMPT_LIMIT) {
            setAttempts(0);
            const timeSinceBoot = await NativeModules.Timer.getRelativeTime();
            const bannedUntil =
              Number(timeSinceBoot) + PIN_CONFIG.ATTEMPT_LOCK_OUT_TIME;
            dispatch(AppActions.pinBannedUntil(bannedUntil));
            const timer = setCountDown(bannedUntil, Number(timeSinceBoot));
            return () => {
              clearInterval(timer);
            };
          }
        } catch (err) {
          const errStr =
            err instanceof Error ? err.message : JSON.stringify(err);
          logger.error(`checkAttempts error: ${errStr}`);
        }
      };
      checkAttempts();
    }, [attempts, dispatch, logger, setCountDown]);

    useEffect(() => {
      const checkIfBanned = async () => {
        try {
          const timeSinceBoot = await NativeModules.Timer.getRelativeTime();
          if (pinBannedUntil && Number(timeSinceBoot) < pinBannedUntil) {
            const totalSecsToRelease = pinBannedUntil - Number(timeSinceBoot);
            // workaround for inconsistencies between the stored timeSinceBoot with the timeSinceBoot that results after the system been hibernated or suspended
            if (totalSecsToRelease > PIN_CONFIG.ATTEMPT_LOCK_OUT_TIME) {
              const bannedUntil =
                Number(timeSinceBoot) + PIN_CONFIG.ATTEMPT_LOCK_OUT_TIME;
              dispatch(AppActions.pinBannedUntil(bannedUntil));
              return;
            }
            const timer = setCountDown(pinBannedUntil, Number(timeSinceBoot));
            return () => {
              clearInterval(timer);
            };
          } else if (pinBannedUntil) {
            dispatch(AppActions.pinBannedUntil(undefined));
          }
        } catch (err) {
          const errStr =
            err instanceof Error ? err.message : JSON.stringify(err);
          logger.error(`checkIfBanned error: ${errStr}`);
        }
      };
      checkIfBanned();
    }, [dispatch, pinBannedUntil, setCountDown, logger]);

    const handleBackPress = useCallback(() => {
      dispatch(AppActions.dismissPinModal());
      reset();
    }, [dispatch, reset]);

    const animatedStyle = useMemo(() => ({opacity: fadeAnim}), [fadeAnim]);

    return (
      <Animated.View style={[styles.pinContainer, animatedStyle]}>
        {showBackButton ? (
          <View style={[styles.sheetHeaderContainer, headerStyle]}>
            <TouchableOpacity
              activeOpacity={ActiveOpacity}
              onPress={handleBackPress}>
              <Back
                color={White}
                background={'rgba(255, 255, 255, 0.2)'}
                opacity={1}
              />
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={styles.upperContainer}>
          <View>
            <View>
              <BitPayLogo height={50} />
            </View>
            <Animated.View style={styles.pinMessagesContainer}>
              <H5 style={styles.pinMessage}>{message}</H5>
            </Animated.View>
            <PinDots
              shakeDots={shakeDots}
              setShakeDots={setShakeDots}
              pinLength={PIN_CONFIG.PIN_LENGTH}
              pin={pinStatus.pin}
            />
            <Animated.View style={styles.pinMessagesErrorContainer}>
              <H7 style={styles.pinMessageError}>{messageError}</H7>
            </Animated.View>
          </View>
        </View>
        <View
          style={styles.virtualKeyboardContainer}
          testID="virtual-key-container">
          <VirtualKeyboard
            showDot={false}
            onCellPress={handleCellPress}
            darkModeOnly={true}
          />
        </View>
      </Animated.View>
    );
  }),
);

const PinModalContent: React.FC<{onModalHide: () => void}> = React.memo(
  ({onModalHide}) => {
    const isVisible = useAppSelector(({APP}) => APP.showPinModal);
    const dispatch = useAppDispatch();

    const handleBackdropPress = useCallback(() => {
      dispatch(AppActions.dismissPinModal());
    }, [dispatch]);

    return (
      <SheetModal
        modalLibrary="bottom-sheet"
        isVisible={isVisible}
        onBackdropPress={handleBackdropPress}
        onModalHide={onModalHide}
        fullscreen
        enableBackdropDismiss={false}
        backgroundColor={BitPay}
        disableAnimations>
        <Pin />
      </SheetModal>
    );
  },
);

const PinModal: React.FC = React.memo(() => {
  const isVisible = useAppSelector(({APP}) => APP.showPinModal);
  const {shouldRenderModal, handleModalHide} =
    useModalContentLifecycle(isVisible);

  return shouldRenderModal ? (
    <PinModalContent onModalHide={handleModalHide} />
  ) : null;
});

export default PinModal;
