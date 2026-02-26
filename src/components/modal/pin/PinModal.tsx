import {navigationRef} from '../../../Root';
import isEqual from 'lodash.isequal';
import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {Animated, DeviceEventEmitter, View, NativeModules} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {gestureHandlerRootHOC} from 'react-native-gesture-handler';
import styled from 'styled-components/native';
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
import {ActiveOpacity, ScreenGutter} from '../../styled/Containers';
import {H5, H7} from '../../styled/Text';
import SheetModal from '../base/sheet/SheetModal';
import PinDots from './PinDots';
import {verifyAndMigratePin, createPin, PIN_CONFIG} from '../../../utils/pin';

export interface PinModalConfig {
  type: 'set' | 'check';
  context?: 'onboarding';
  onClose?: (checked?: boolean) => void;
}

const PinContainer = styled(Animated.View)`
  flex: 1;
  background-color: ${BitPay};
`;

const UpperContainer = styled.View`
  flex: 1;
  justify-content: center;
`;

const PinMessagesContainer = styled(Animated.View)`
  align-items: center;
  text-align: center;
  margin-top: 32px;
`;

const PinMessage = styled(H5)`
  color: ${White};
  line-height: 25px;
`;

const PinMessagesErrorContainer = styled(Animated.View)`
  align-items: center;
  text-align: center;
  margin: 16px 25px;
`;

const PinMessageError = styled(H7)`
  color: ${Warning75};
  font-size: 14px;
`;

const VirtualKeyboardContainer = styled.View`
  margin-bottom: 5%;
  padding-bottom: 10px;
`;

const SheetHeaderContainer = styled.View`
  align-items: center;
  flex-direction: row;
`;

const headerStyle = {paddingLeft: 25};

const Pin = gestureHandlerRootHOC(
  React.memo(() => {
    const {t} = useTranslation();
    const logger = useLogger();
    const dispatch = useAppDispatch();
    const {type, context, onClose} =
      useAppSelector(({APP}) => APP.pinModalConfig) || {};
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
        } catch (error) {
          logger.error(`checkPin error: ${error}`);
        }
      },
      [
        dispatch,
        setShakeDots,
        setMessage,
        setPinStatus,
        setAttempts,
        currentPin,
        currentSalt,
        t,
      ],
    );

    const gotoCreateKey = useCallback(async () => {
      navigationRef.navigate('CreateKey' as any);
      await sleep(10);
      dispatch(AppActions.dismissPinModal());
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
              gotoCreateKeyRef.current();
            } else {
              dispatch(AppActions.dismissPinModal());
            }
          } else {
            setShakeDots(true);
            reset();
          }
        } catch (err) {
          const errStr = err instanceof Error ? err.message : String(err);
          logger.error(`setCurrentPin error: ${err}`);
          setMessageError(errStr);
          reset();
          setShakeDots(true);
        }
      },
      [dispatch, setShakeDots, reset, context],
    );

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
      [setPinStatus, reset, pinStatus],
    );

    useEffect(() => {
      const onCellPress = async () => {
        if (pinStatus.pin.length !== PIN_CONFIG.PIN_LENGTH) {
          // Waiting for more PIN digits
          return;
        }
        // Give some time for dot to fill
        await sleep(0);
        if (type === 'set') {
          if (pinStatus.firstPinEntered.length) {
            setCurrentPin(
              pinStatus as {firstPinEntered: Array<string>; pin: Array<string>},
            );
          } else {
            setMessage(t('Confirm your PIN'));
            setPinStatus({pin: [], firstPinEntered: pinStatus.pin});
          }
        } else {
          checkPin(pinStatus.pin as Array<string>);
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
          logger.error(`checkAttempts error: ${err}`);
        }
      };
      checkAttempts();
    }, [dispatch, attempts]);

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
          logger.error(`checkIfBanned error: ${err}`);
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
      <PinContainer style={animatedStyle}>
        {showBackButton ? (
          <SheetHeaderContainer style={headerStyle}>
            <TouchableOpacity
              activeOpacity={ActiveOpacity}
              onPress={handleBackPress}>
              <Back
                color={White}
                background={'rgba(255, 255, 255, 0.2)'}
                opacity={1}
              />
            </TouchableOpacity>
          </SheetHeaderContainer>
        ) : null}
        <UpperContainer>
          <View>
            <View>
              <BitPayLogo height={50} />
            </View>
            <PinMessagesContainer>
              <PinMessage>{message}</PinMessage>
            </PinMessagesContainer>
            <PinDots
              shakeDots={shakeDots}
              setShakeDots={setShakeDots}
              pinLength={PIN_CONFIG.PIN_LENGTH}
              pin={pinStatus.pin}
            />
            <PinMessagesErrorContainer>
              <PinMessageError>{messageError}</PinMessageError>
            </PinMessagesErrorContainer>
          </View>
        </UpperContainer>
        <VirtualKeyboardContainer accessibilityLabel="virtual-key-container">
          <VirtualKeyboard
            showDot={false}
            onCellPress={handleCellPress}
            darkModeOnly={true}
          />
        </VirtualKeyboardContainer>
      </PinContainer>
    );
  }),
);

const PinModal: React.FC = React.memo(() => {
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
      fullscreen
      enableBackdropDismiss={false}
      backgroundColor={BitPay}
      disableAnimations>
      <Pin />
    </SheetModal>
  );
});

export default PinModal;
