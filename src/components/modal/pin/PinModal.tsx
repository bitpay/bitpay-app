import {useNavigation} from '@react-navigation/native';
import isEqual from 'lodash.isequal';
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {Animated, TouchableOpacity, View, NativeModules} from 'react-native';
import {gestureHandlerRootHOC} from 'react-native-gesture-handler';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import styled, {useTheme} from 'styled-components/native';
import BitPayLogo from '../../../../assets/img/logos/bitpay-white.svg';
import VirtualKeyboard from '../../../components/virtual-keyboard/VirtualKeyboard';
import {LOCK_AUTHORIZED_TIME} from '../../../constants/Lock';
import {BwcProvider} from '../../../lib/bwc';
import {AppActions} from '../../../store/app';
import {BitPay, White} from '../../../styles/colors';
import {sleep} from '../../../utils/helper-methods';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import Back from '../../back/Back';
import haptic from '../../haptic-feedback/haptic';
import {ActiveOpacity} from '../../styled/Containers';
import {H5} from '../../styled/Text';
import BaseModal from '../base/BaseModal';
import PinDots from './PinDots';

export interface PinModalConfig {
  type: 'set' | 'check';
  context?: 'onboarding';
  onClose?: (checked?: boolean) => void;
}

const PinContainer = styled.View`
  flex: 1;
  background-color: ${BitPay};
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

const VirtualKeyboardContainer = styled.View`
  margin-bottom: 10%;
`;

const SheetHeaderContainer = styled.View`
  margin: 20px 0;
  align-items: center;
  flex-direction: row;
`;

const BWCProvider = BwcProvider.getInstance();
const sjcl = BWCProvider.getSJCL();
const PIN_MAX_VALUE = 9;
const PIN_MIN_VALUE = 0;
const PIN_LENGTH = 4;
const ATTEMPT_LIMIT = 3;
const ATTEMPT_LOCK_OUT_TIME = 2 * 60;

export const hashPin = (pin: string[]) => {
  const bits = sjcl.hash.sha256.hash(pin.join(''));

  return sjcl.codec.hex.fromBits(bits);
};

const Pin = gestureHandlerRootHOC(() => {
  const {t} = useTranslation();
  const logger = useLogger();
  const dispatch = useAppDispatch();
  const {type, context, onClose} =
    useAppSelector(({APP}) => APP.pinModalConfig) || {};
  const [pin, setPin] = useState<Array<string | undefined>>([]);
  const [headerMargin, setHeaderMargin] = useState<string>(
    type === 'set' || onClose ? '10%' : '40%',
  );
  const [message, setMessage] = useState<string>(t('Please enter your PIN'));
  const [shakeDots, setShakeDots] = useState(false);
  const insets = useSafeAreaInsets();
  const [showBackButton, setShowBackButton] = useState<boolean>();
  const navigation = useNavigation();

  useEffect(() => {
    if (type === 'set' || onClose) {
      setShowBackButton(true);
    }
  }, [type, onClose]);

  // checkPin
  const currentPin = useAppSelector(({APP}) => APP.currentPin);
  const pinBannedUntil = useAppSelector(({APP}) => APP.pinBannedUntil);
  const [attempts, setAttempts] = useState<number>(0);

  // setPin
  const [firstPinEntered, setFirstPinEntered] = useState<
    Array<string | undefined>
  >([]);

  const reset = useCallback(() => {
    setMessage(t('Please enter your PIN'));
    setFirstPinEntered([]);
    setAttempts(0);
    setPin([]);
  }, [setMessage, setFirstPinEntered, setAttempts, setPin, t]);

  const checkPin = useCallback(
    async (pinToCheck: Array<string>) => {
      const pinHash = hashPin(pinToCheck);

      if (isEqual(currentPin, pinHash)) {
        dispatch(AppActions.showBlur(false));
        const timeSinceBoot = await NativeModules.Timer.getRelativeTime();
        const authorizedUntil = Number(timeSinceBoot) + LOCK_AUTHORIZED_TIME;
        dispatch(AppActions.lockAuthorizedUntil(authorizedUntil));
        dispatch(AppActions.dismissPinModal()); // Correct PIN dismiss modal
        onClose?.(true);
      } else {
        setShakeDots(true);
        setMessage(t('Incorrect PIN, try again'));
        setPin([]);
        setAttempts(_attempts => _attempts + 1); // Incorrect increment attempts
      }
    },
    [dispatch, setShakeDots, setMessage, setPin, setAttempts, currentPin, t],
  );

  const gotoCreateKey = async () => {
    navigation.navigate('Onboarding', {
      screen: 'CreateKey',
    });
    await sleep(10);
    dispatch(AppActions.dismissPinModal());
  };
  const gotoCreateKeyRef = useRef(gotoCreateKey);
  gotoCreateKeyRef.current = gotoCreateKey;

  const setCurrentPin = useCallback(
    async (newPin: Array<string>) => {
      try {
        if (isEqual(firstPinEntered, newPin)) {
          dispatch(AppActions.pinLockActive(true));
          const pinHash = hashPin(newPin);
          dispatch(AppActions.currentPin(pinHash));
          dispatch(AppActions.showBlur(false));
          const timeSinceBoot = await NativeModules.Timer.getRelativeTime();
          const authorizedUntil = Number(timeSinceBoot) + LOCK_AUTHORIZED_TIME;
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
        logger.error(`setCurrentPin error: ${err}`);
      }
    },
    [dispatch, setShakeDots, reset, firstPinEntered, context],
  );

  const handleCellPress = useCallback(
    (value: string) => {
      let newPin = pin.slice();
      switch (value) {
        case 'reset':
          reset();
          newPin = [];
          break;
        case 'backspace':
          newPin.splice(-1);
          setPin(newPin);
          break;
        default:
          if (
            Number(value) >= PIN_MIN_VALUE &&
            Number(value) <= PIN_MAX_VALUE &&
            pin.length <= PIN_LENGTH
          ) {
            // Adding new PIN
            newPin[newPin.length] = value;
            setPin(newPin);
          }
          break;
      }
      return newPin;
    },
    [setPin, reset, pin],
  );

  const onCellPress = useCallback(
    async (value: string) => {
      if (pinBannedUntil) {
        // banned wait for entering new pin
        return;
      }
      haptic('soft');

      const newPin = handleCellPress(value);

      if (newPin.length !== PIN_LENGTH) {
        // Waiting for more PIN digits
        return;
      }

      // Give some time for dot to fill
      await sleep(0);

      if (type === 'set') {
        if (firstPinEntered.length) {
          setCurrentPin(newPin as Array<string>);
        } else {
          setMessage(t('Confirm your PIN'));
          setFirstPinEntered(newPin);
          setPin([]);
        }
      } else {
        checkPin(newPin as Array<string>);
      }
    },
    [
      setCurrentPin,
      setMessage,
      setFirstPinEntered,
      setPin,
      handleCellPress,
      checkPin,
      firstPinEntered.length,
      pinBannedUntil,
      type,
      t,
    ],
  );

  const setCountDown = (
    bannedUntil: number,
    timeSinceBoot: number,
    count: number = 0,
  ) => {
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
  };

  useEffect(() => {
    const checkAttempts = async () => {
      try {
        if (attempts === ATTEMPT_LIMIT) {
          setAttempts(0);
          const timeSinceBoot = await NativeModules.Timer.getRelativeTime();
          const bannedUntil = Number(timeSinceBoot) + ATTEMPT_LOCK_OUT_TIME;
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
  }, [dispatch, pinBannedUntil]);

  return (
    <PinContainer>
      {showBackButton ? (
        <SheetHeaderContainer style={{marginTop: insets.top, marginLeft: 15}}>
          <TouchableOpacity
            activeOpacity={ActiveOpacity}
            onPress={() => {
              dispatch(AppActions.dismissPinModal());
              reset();
            }}>
            <Back
              color={White}
              background={'rgba(255, 255, 255, 0.2)'}
              opacity={1}
            />
          </TouchableOpacity>
        </SheetHeaderContainer>
      ) : null}
      <View style={{marginTop: headerMargin}}>
        <BitPayLogo height={50} />
      </View>
      <PinMessagesContainer>
        <PinMessage>{message}</PinMessage>
      </PinMessagesContainer>
      <PinDots
        shakeDots={shakeDots}
        setShakeDots={setShakeDots}
        pinLength={PIN_LENGTH}
        pin={pin}
      />
      <VirtualKeyboardContainer accessibilityLabel="virtual-key-container">
        <VirtualKeyboard
          showDot={false}
          onCellPress={onCellPress}
          darkModeOnly={true}
        />
      </VirtualKeyboardContainer>
    </PinContainer>
  );
});

const PinModal: React.FC = () => {
  const isVisible = useAppSelector(({APP}) => APP.showPinModal);
  const theme = useTheme();

  return (
    <BaseModal
      accessibilityLabel="pin-view"
      id={'pin'}
      isVisible={isVisible}
      coverScreen={true}
      backdropTransitionOutTiming={0}
      hideModalContentWhileAnimating
      backdropOpacity={1}
      backdropColor={theme.colors.background}
      animationIn={'fadeIn'}
      animationOut={'fadeOut'}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}
      style={{margin: 0}}>
      <Pin />
    </BaseModal>
  );
};

export default PinModal;
