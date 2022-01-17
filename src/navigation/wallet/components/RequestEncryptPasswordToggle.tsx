import {AppActions} from '../../../store/app';
import ToggleSwitch from '../../../components/toggle-switch/ToggleSwitch';
import React, {useEffect, useState} from 'react';
import {
  ExtendedKeyValues,
  WalletObj,
} from '../../../store/wallet/wallet.models';
import {useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../../store';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {WalletActions} from '../../../store/wallet';
import {useLogger} from '../../../utils/hooks/useLogger';
import {GeneralError, WrongPasswordError} from './DecryptPasswordErrorMessages';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';

const RequestEncryptPasswordToggle = ({wallet}: {wallet: WalletObj}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const logger = useLogger();

  const [passwordToggle, setPasswordToggle] = useState(
    !!wallet.isPrivKeyEncrypted,
  );

  const key: ExtendedKeyValues | undefined = useSelector(
    ({WALLET}: RootState) => WALLET.keys.find(k => k.id === wallet.id),
  );

  useEffect(() => {
    setPasswordToggle(!!wallet.isPrivKeyEncrypted);
  }, [wallet.isPrivKeyEncrypted]);

  const showErrorMessage = (msg: BottomNotificationConfig) => {
    setTimeout(() => {
      dispatch(showBottomNotificationModal(msg));
    }, 500); // Wait to close Decrypt Password modal
  };

  const onSubmitPassword = (password: string) => {
    if (key) {
      try {
        key.decrypt(password);
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
        if (!wallet.isPrivKeyEncrypted) {
          navigation.navigate('Wallet', {
            screen: 'CreateEncryptPassword',
            params: {wallet},
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
