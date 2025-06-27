import {AppActions} from '../../../store/app';
import ToggleSwitch from '../../../components/toggle-switch/ToggleSwitch';
import React, {useEffect, useState} from 'react';
import {Key} from '../../../store/wallet/wallet.models';
import {useNavigation} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {
  dismissBottomNotificationModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {WalletActions} from '../../../store/wallet';
import {useLogger} from '../../../utils/hooks/useLogger';
import {DecryptError, WrongPasswordError} from './ErrorMessages';
import {sleep} from '../../../utils/helper-methods';
import {useTranslation} from 'react-i18next';
import {Constants} from 'bitcore-wallet-client/ts_build/lib/common';
import {checkPrivateKeyEncrypted} from '../../../store/wallet/utils/wallet';

const RequestEncryptPasswordToggle = ({currentKey: key}: {currentKey: Key}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const logger = useLogger();

  const [passwordToggle, setPasswordToggle] = useState(
    !!checkPrivateKeyEncrypted(key),
  );

  useEffect(() => {
    return navigation.addListener('focus', () => {
      setPasswordToggle(!!checkPrivateKeyEncrypted(key));
    });
  }, [navigation, key.methods]);

  const onSubmitPassword = async (password: string) => {
    if (key) {
      try {
        Object.values(Constants.ALGOS).forEach(algo => {
          try {
            logger.debug(
              `Decrypting private key for: ${key.keyName} - with algo: ${algo}`,
            );
            key.methods!.decrypt(password, algo);
          } catch (err) {
            const errMsg =
              err instanceof Error ? err.message : JSON.stringify(err);
            if (errMsg && errMsg.includes('Could not decrypt')) {
              throw err;
            }
            logger.debug(`error decrypting with ${algo}: ${errMsg}`);
          }
        });
        logger.debug('Key Decrypted');
        dispatch(
          WalletActions.successEncryptOrDecryptPassword({
            key,
          }),
        );
        setPasswordToggle(false);
        dispatch(AppActions.dismissDecryptPasswordModal());
        await sleep(500);
        dispatch(
          showBottomNotificationModal({
            type: 'success',
            title: t('Password removed'),
            message: t(
              'Your encryption password has been removed. This key is now decrypted.',
            ),
            enableBackdropDismiss: true,
            actions: [
              {
                text: t('GOT IT'),
                action: () => {
                  dispatch(dismissBottomNotificationModal());
                },
                primary: true,
              },
            ],
          }),
        );
      } catch (e) {
        console.log(`Decrypt Error: ${e}`);
        dispatch(AppActions.dismissDecryptPasswordModal());
        await sleep(500); // Wait to close Decrypt Password modal
        dispatch(showBottomNotificationModal(WrongPasswordError()));
      }
    } else {
      dispatch(AppActions.dismissDecryptPasswordModal());
      await sleep(500); // Wait to close Decrypt Password modal
      dispatch(showBottomNotificationModal(DecryptError()));
      logger.debug('Missing Key Error');
    }
  };

  return (
    <ToggleSwitch
      onChange={() => {
        if (!passwordToggle) {
          navigation.navigate('CreateEncryptPassword', {key});
        } else {
          dispatch(
            AppActions.showDecryptPasswordModal({
              onSubmitHandler: onSubmitPassword,
              description: t(
                'To disable encryption for your wallet, please enter your encryption password below.',
              ),
            }),
          );
        }
      }}
      isEnabled={passwordToggle}
    />
  );
};

export default RequestEncryptPasswordToggle;
