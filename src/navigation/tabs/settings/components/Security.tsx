import {Settings} from '../SettingsRoot';
import {
  Setting,
  SettingTitle,
  SheetContainer,
} from '../../../../components/styled/Containers';
import Button from '../../../../components/button/Button';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import {Platform} from 'react-native';
import React, {useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useThemeType} from '../../../../utils/hooks/useThemeType';
import {RootState} from '../../../../store';
import {AppActions} from '../../../../store/app';
import TouchID from 'react-native-touch-id';
import {
  authOptionalConfigObject,
  BiometricError,
  BiometricErrorNotification,
  isSupportedOptionalConfigObject,
  TO_HANDLE_ERRORS,
} from '../../../../constants/BiometricError';
import {LOCK_AUTHORIZED_TIME} from '../../../../constants/Lock';
import {showBottomNotificationModal} from '../../../../store/app/app.actions';
import {sleep} from '../../../../utils/helper-methods';
import FingerprintImg from '../../../../../assets/img/fingerprint.svg';
import FingerprintDarkModeImg from '../../../../../assets/img/fingerprint-darkmode.svg';
import FaceImg from '../../../../../assets/img/face.svg';
import FaceDarkModeImg from '../../../../../assets/img/face-darkmode.svg';
import PinImg from '../../../../../assets/img/pin.svg';
import PinDarkModeImg from '../../../../../assets/img/pin-darkmode.svg';
import styled, {css} from 'styled-components/native';
import {
  Action,
  Midnight,
  ProgressBlue,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {H4, Paragraph} from '../../../../components/styled/Text';
const FingerprintSvg = {
  light: <FingerprintImg />,
  dark: <FingerprintDarkModeImg />,
};

const FaceSvg = {
  light: <FaceImg />,
  dark: <FaceDarkModeImg />,
};

const PinSvg = {
  light: <PinImg />,
  dark: <PinDarkModeImg />,
};

interface ContainerProps {
  isSelected: boolean;
}

const ImgContainer = styled.TouchableOpacity<ContainerProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 65px;
  width: 65px;
  background-color: ${({theme: {dark}}) => (dark ? Midnight : '#ECEFFD')};
  border-radius: 50px;
  ${({isSelected}) =>
    isSelected &&
    css`
      border-color: ${({theme: {dark}}) => (dark ? ProgressBlue : Action)};
      border-width: 2px;
    `};
`;

const CtaContainer = styled.View`
  margin: 10px 0;
`;

const Header = styled.View`
  flex-direction: row;
`;

const Title = styled(H4)`
  margin-left: 10px;
  width: 100%;
  text-align: center;
`;

const EnableLockModalParagraph = styled(Paragraph)`
  margin: 15px 0 20px;
  color: ${({theme}) => (theme.dark ? White : SlateDark)};
`;

const ImgRow = styled.View`
  flex-direction: row;
  justify-content: space-evenly;
  margin-bottom: 20px;
`;

const Security = () => {
  const dispatch = useDispatch();
  const themeType = useThemeType();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLock, setSelectedLock] = useState('');

  const pinLockActive = useSelector(({APP}: RootState) => APP.pinLockActive);
  const biometricLockActive = useSelector(
    ({APP}: RootState) => APP.biometricLockActive,
  );
  const hideModal = () => {
    setSelectedLock('');
    setModalVisible(false);
  };

  const setPin = () => {
    dispatch(AppActions.showPinModal({type: 'set'}));
  };

  const removePin = () => {
    dispatch(AppActions.currentPin(undefined));
    dispatch(AppActions.pinLockActive(false));
  };

  const setBiometric = () => {
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
        const authorizedUntil =
          Math.floor(Date.now() / 1000) + LOCK_AUTHORIZED_TIME;
        dispatch(AppActions.lockAuthorizedUntil(authorizedUntil));
        dispatch(AppActions.biometricLockActive(true));
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

  const removeBiometric = () => {
    dispatch(AppActions.biometricLockActive(false));
  };

  const onPressLockButton = () => {
    if (biometricLockActive) {
      removeBiometric();
      return;
    }
    if (pinLockActive) {
      removePin();
      return;
    }
    setModalVisible(true);
  };

  const setLockOption = async () => {
    hideModal();
    switch (selectedLock) {
      case 'fingerprint':
      case 'face':
        setBiometric();
        break;

      case 'pin':
        await sleep(500); // avoid modal conflicting with options sheet
        setPin();
        break;
    }
  };
  return (
    <>
      <Settings>
        <Setting onPress={onPressLockButton}>
          <SettingTitle>Lock App</SettingTitle>
          <Button onPress={onPressLockButton} buttonType={'pill'}>
            {biometricLockActive || pinLockActive ? 'Enabled' : 'Disabled'}
          </Button>
        </Setting>
      </Settings>
      <SheetModal isVisible={modalVisible} onBackdropPress={hideModal}>
        <SheetContainer>
          <Header>
            <Title>Enable Lock</Title>
          </Header>

          <EnableLockModalParagraph>
            Secure app with biometric credentials or a PIN
          </EnableLockModalParagraph>

          <ImgRow>
            {Platform.OS === 'android' && (
              <ImgContainer
                isSelected={selectedLock === 'fingerprint'}
                onPress={() => setSelectedLock('fingerprint')}>
                {FingerprintSvg[themeType]}
              </ImgContainer>
            )}
            {Platform.OS === 'ios' && (
              <ImgContainer
                isSelected={selectedLock === 'face'}
                onPress={() => setSelectedLock('face')}>
                {FaceSvg[themeType]}
              </ImgContainer>
            )}
            <ImgContainer
              isSelected={selectedLock === 'pin'}
              onPress={() => setSelectedLock('pin')}>
              {PinSvg[themeType]}
            </ImgContainer>
          </ImgRow>
          <CtaContainer>
            <Button
              onPress={setLockOption}
              buttonStyle={'primary'}
              disabled={!selectedLock}>
              Confirm
            </Button>
          </CtaContainer>
          <CtaContainer>
            <Button onPress={hideModal} buttonStyle={'secondary'}>
              Cancel
            </Button>
          </CtaContainer>
        </SheetContainer>
      </SheetModal>
    </>
  );
};

export default Security;
