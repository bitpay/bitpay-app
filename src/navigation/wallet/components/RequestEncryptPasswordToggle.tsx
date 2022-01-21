import {AppActions} from '../../../store/app';
import ToggleSwitch from '../../../components/toggle-switch/ToggleSwitch';
import React, {useEffect, useState} from 'react';
import {Key} from '../../../store/wallet/wallet.models';
import {useNavigation} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {WalletActions} from '../../../store/wallet';
import {useLogger} from '../../../utils/hooks/useLogger';
import {GeneralError, WrongPasswordError} from './DecryptPasswordErrorMessages';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';

const RequestEncryptPasswordToggle = ({currentKey: key}: {currentKey: Key}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const logger = useLogger();

  const [passwordToggle, setPasswordToggle] = useState(
    !!key.methods.isPrivKeyEncrypted(),
  );

  useEffect(() => {
    setPasswordToggle(!!key.methods.isPrivKeyEncrypted());
  });

  const showErrorMessage = (msg: BottomNotificationConfig) => {
    setTimeout(() => {
      dispatch(showBottomNotificationModal(msg));
    }, 500); // Wait to close Decrypt Password modal
  };

  const onSubmitPassword = (password: string) => {
    if (key) {
      try {
        key.methods.decrypt(password);
        logger.debug('Key Decrypted');
        dispatch(
          WalletActions.successEncryptOrDecryptPassword({
            key,
          }),
        );
        setPasswordToggle(false);
        dispatch(AppActions.dissmissDecryptPasswordModal());
      } catch (e) {
        console.log(`Decrypt Error: ${e}`);
        dispatch(AppActions.dissmissDecryptPasswordModal());
        showErrorMessage(WrongPasswordError());
      }
    } else {
      dispatch(AppActions.dissmissDecryptPasswordModal());
      showErrorMessage(GeneralError);
      logger.debug('Missing Key Error');
    }
  };

  return (
    <ToggleSwitch
      onChange={() => {
        if (!passwordToggle) {
          navigation.navigate('Wallet', {
            screen: 'CreateEncryptPassword',
            params: {key},
          });
        } else {
          dispatch(
            AppActions.showDecryptPasswordModal({
              onSubmitHandler: onSubmitPassword,
              description:
                'To disable encryption for your wallet, please enter your encryption password below.',
            }),
          );
        }
      }}
      isEnabled={passwordToggle}
    />
  );
};

export default RequestEncryptPasswordToggle;
