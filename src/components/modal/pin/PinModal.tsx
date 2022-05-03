import Modal from 'react-native-modal';
import React, {useState, useEffect} from 'react';
import {AppActions} from '../../../store/app';
import PinDots from './PinDots';
import haptic from '../../haptic-feedback/haptic';
import {BwcProvider} from '../../../lib/bwc';
import isEqual from 'lodash.isequal';
import {sleep} from '../../../utils/helper-methods';
import VirtualKeyboard from '../../../components/virtual-keyboard/VirtualKeyboard';
import styled, {useTheme} from 'styled-components/native';
import {Animated, TouchableOpacity, View} from 'react-native';
import {H5} from '../../styled/Text';
import {LOCK_AUTHORIZED_TIME} from '../../../constants/Lock';
import {Action, White} from '../../../styles/colors';
import BitPayLogo from '../../../../assets/img/logos/bitpay-white.svg';
import {ActiveOpacity} from '../../styled/Containers';
import Back from '../../back/Back';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {gestureHandlerRootHOC} from 'react-native-gesture-handler';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';

export interface PinModalConfig {
  type: 'set' | 'check';
}

const PinContainer = styled.View`
  flex: 1;
  background-color: ${Action};
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

const PinModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const isVisible = useAppSelector(({APP}) => APP.showPinModal);
  const {type} = useAppSelector(({APP}) => APP.pinModalConfig) || {};
  const [pin, setPin] = useState<Array<string | undefined>>([]);
  const [message, setMessage] = useState('Please enter your PIN');
  const [shakeDots, setShakeDots] = useState(false);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [showBackButton, setShowBackButton] = useState<boolean>();

  useEffect(() => {
    if (type === 'set' && !showBackButton) {
      setShowBackButton(true);
    }
  }, [type]);

  // checkPin
  const currentPin = useAppSelector(({APP}) => APP.currentPin);
  const pinBannedUntil = useAppSelector(({APP}) => APP.pinBannedUntil);
  const [attempts, setAttempts] = useState<number>(0);

  // setPin
  const [firstPinEntered, setFirstPinEntered] = useState<
    Array<string | undefined>
  >([]);

  const reset = () => {
    setMessage('Please enter your PIN');
    setFirstPinEntered([]);
    setAttempts(0);
    setPin([]);
  };

  const checkPin = (pin: Array<string>) => {
    const pinHash = sjcl.codec.hex.fromBits(
      sjcl.hash.sha256.hash(pin.join('')),
    );
    if (isEqual(currentPin, pinHash)) {
      dispatch(AppActions.showBlur(false));
      const authorizedUntil =
        Math.floor(Date.now() / 1000) + LOCK_AUTHORIZED_TIME;
      dispatch(AppActions.lockAuthorizedUntil(authorizedUntil));
      dispatch(AppActions.dismissPinModal()); // Correct PIN dismiss modal
      setTimeout(reset, 300);
    } else {
      setShakeDots(true);
      setMessage('Incorrect PIN, try again');
      setPin([]);
      setAttempts(attempts + 1); // Incorrect increment attempts
    }
  };

  const setCurrentPin = (pin: Array<string>) => {
    if (isEqual(firstPinEntered, pin)) {
      dispatch(AppActions.pinLockActive(true));
      const pinHash = sjcl.codec.hex.fromBits(
        sjcl.hash.sha256.hash(pin.join('')),
      );
      dispatch(AppActions.currentPin(pinHash));
      dispatch(AppActions.showBlur(false));
      const authorizedUntil =
        Math.floor(Date.now() / 1000) + LOCK_AUTHORIZED_TIME;
      dispatch(AppActions.lockAuthorizedUntil(authorizedUntil));
      dispatch(AppActions.dismissPinModal());
      setTimeout(reset, 300);
      return;
    } else {
      setShakeDots(true);
    }
    reset();
  };

  const handleCellPress = (value: string) => {
    let newPin = [...pin];
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
  };

  const onCellPress = async (value: string) => {
    if (pinBannedUntil) {
      // banned wait for entering new pin
      return;
    }
    haptic('impactLight');

    const newPin = handleCellPress(value);

    if (newPin.length !== PIN_LENGTH) {
      // Waiting for more PIN digits
      return;
    }

    // Give some time for dot to fill
    await sleep(0);

    if (!firstPinEntered.length && type === 'set') {
      setMessage('Confirm your PIN');
      setFirstPinEntered(newPin);
      setPin([]);
    } else if (firstPinEntered.length && type === 'set') {
      setCurrentPin(newPin as Array<string>);
    } else {
      checkPin(newPin as Array<string>);
    }
  };

  const setCountDown = (bannedUntil: number) => {
    return setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const totalSecs = bannedUntil - now;

      if (totalSecs < 0) {
        dispatch(AppActions.pinBannedUntil(undefined));
        reset();
        return;
      }

      const m = Math.floor(totalSecs / 60);
      const s = totalSecs % 60;
      setMessage(`Try again in ${('0' + m).slice(-2)}:${('0' + s).slice(-2)}`);
    }, 1000);
  };

  useEffect(() => {
    if (attempts === ATTEMPT_LIMIT) {
      setAttempts(0);
      const bannedUntil = Math.floor(Date.now() / 1000) + ATTEMPT_LOCK_OUT_TIME;
      dispatch(AppActions.pinBannedUntil(bannedUntil));
      const timer = setCountDown(bannedUntil);
      return () => {
        clearInterval(timer);
      };
    }
  }, [attempts]);

  useEffect(() => {
    const now = Math.floor(Date.now() / 1000);
    if (pinBannedUntil && now < pinBannedUntil) {
      const timer = setCountDown(pinBannedUntil);
      return () => {
        clearInterval(timer);
      };
    } else if (pinBannedUntil) {
      dispatch(AppActions.pinBannedUntil(undefined));
    }
  }, [pinBannedUntil]);

  const Pin = gestureHandlerRootHOC(() => {
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
        <View style={{marginTop: type === 'set' ? '10%' : '40%'}}>
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
        <VirtualKeyboardContainer>
          <VirtualKeyboard
            showDot={false}
            onCellPress={onCellPress}
            darkModeOnly={true}
          />
        </VirtualKeyboardContainer>
      </PinContainer>
    );
  });

  return (
    <Modal
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
    </Modal>
  );
};

export default PinModal;
