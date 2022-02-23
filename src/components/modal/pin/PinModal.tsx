import Modal from 'react-native-modal';
import React, {useState, useEffect} from 'react';
import {RootState} from '../../../store';
import {AppActions} from '../../../store/app';
import {useDispatch, useSelector} from 'react-redux';
import PinDots from '../../pin-dots/PinDots';
import PinMessages from '../../../components/pin-messages/PinMessages';
import haptic from '../../haptic-feedback/haptic';
import {BwcProvider} from '../../../lib/bwc';
import isEqual from 'lodash.isequal';
import {sleep} from '../../../utils/helper-methods';
import VirtualKeyboard from '../../../components/virtual-keyboard/VirtualKeyboard';
import {LightBlack, White} from '../../../styles/colors';
import styled, {useTheme} from 'styled-components/native';

export interface PinModalConfig {
  type: 'set' | 'check';
}

const PinContainer = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : White)};
`;

const BWCProvider = BwcProvider.getInstance();
const sjcl = BWCProvider.getSJCL();
const PIN_MAX_VALUE = 9;
const PIN_MIN_VALUE = 0;
const PIN_LENGTH = 4;
const ATTEMPT_LIMIT = 3;
const ATTEMPT_LOCK_OUT_TIME = 2 * 60;

const PinModal: React.FC = () => {
  const dispatch = useDispatch();
  const isVisible = useSelector(({APP}: RootState) => APP.showPinModal);
  const config = useSelector(({APP}: RootState) => APP.pinModalConfig);
  const [pin, setPin] = useState<Array<string | undefined>>([]);
  const [message, setMessage] = useState<string>('Please enter your PIN');
  const [shakeDots, setShakeDots] = useState<boolean>(false);
  const theme = useTheme();

  // checkPin
  const currentPin = useSelector(({APP}: RootState) => APP.currentPin);
  const pinBannedUntil = useSelector(({APP}: RootState) => APP.pinBannedUntil);
  const [attempts, setAttempts] = useState<number>(0);

  // setPin
  const [fistPinEntered, setFistPinEntered] = useState<
    Array<string | undefined>
  >([]);

  const reset = () => {
    setMessage('Please enter your PIN');
    setFistPinEntered([]);
    setAttempts(0);
    setPin([]);
  };

  const checkPin = (pin: Array<string>) => {
    const pinHash = sjcl.codec.hex.fromBits(
      sjcl.hash.sha256.hash(pin.join('')),
    );
    if (isEqual(currentPin, pinHash)) {
      dispatch(AppActions.dismissPinModal()); // Correct PIN dismiss modal
      reset();
    } else {
      setShakeDots(true);
      setMessage('Incorrect PIN, try again');
      setPin([]);
      setAttempts(attempts + 1); // Incorrect increment attempts
    }
  };

  const setCurrentPin = (pin: Array<string>) => {
    if (isEqual(fistPinEntered, pin)) {
      dispatch(AppActions.pinLockActive(true));
      const pinHash = sjcl.codec.hex.fromBits(
        sjcl.hash.sha256.hash(pin.join('')),
      );
      dispatch(AppActions.currentPin(pinHash));
      dispatch(AppActions.dismissPinModal());
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
    await sleep(500);

    if (!fistPinEntered.length && config?.type == 'set') {
      setMessage('Confirm your PIN');
      setFistPinEntered(newPin);
      setPin([]);
    } else if (fistPinEntered.length && config?.type == 'set') {
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

  return (
    <Modal
      isVisible={isVisible}
      coverScreen={true}
      backdropTransitionOutTiming={0}
      hideModalContentWhileAnimating
      backdropOpacity={1}
      backdropColor={theme.dark ? LightBlack : White}
      animationIn={'fadeInUp'}
      animationOut={'fadeOutDown'}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}>
      <PinContainer>
        <PinMessages message={message} />
        <PinDots
          shakeDots={shakeDots}
          setShakeDots={setShakeDots}
          pinLength={PIN_LENGTH}
          pin={pin}
        />
        <VirtualKeyboard
          showDot={false}
          showLetters={true}
          onCellPress={onCellPress}
        />
      </PinContainer>
    </Modal>
  );
};

export default PinModal;
