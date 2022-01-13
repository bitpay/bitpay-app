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
import {FlatList} from 'react-native';
import {WalletActions} from '../../../store/wallet';
import styled from 'styled-components/native';
import {BaseText} from '../../../components/styled/Text';
import {useLogger} from '../../../utils/hooks/useLogger';

const List = styled(BaseText)`
  margin: 0 0 5px 10px;
`;

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

  const generalError = () => {
    setTimeout(() => {
      dispatch(
        showBottomNotificationModal({
          type: 'error',
          title: 'Something went wrong',
          message: 'Could not decrypt wallet.',
          enableBackdropDismiss: true,
          actions: [
            {
              text: 'OK',
              action: () => {},
              primary: true,
            },
          ],
        }),
      );
    }, 500); // Wait to close Decrypt Password modal
  };

  const wrongPasswordList = [
    {key: 'Try entering any passwords you may have set in the past'},
    {
      key: 'Remember there are no special requirements for the password (numbers, symbols, etc.)',
    },
    {
      key: 'Keep in mind your encrypt password is not the 12-word recovery phrase',
    },
    {
      key: 'You can always reset your encrypt password on your key settings under the option Clear Encrypt Password using your 12 words recovery phrase',
    },
  ];

  const wrongPasswordErr = () => {
    setTimeout(() => {
      dispatch(
        showBottomNotificationModal({
          type: 'error',
          title: 'Wrong password',
          message: 'Forgot Password?',
          enableBackdropDismiss: true,
          actions: [
            {
              text: 'GOT IT',
              action: () => {},
              primary: true,
            },
          ],
          list: (
            <FlatList
              data={wrongPasswordList}
              renderItem={({item}) => (
                <List>
                  {'\u2022'} {item.key}
                </List>
              )}
            />
          ),
        }),
      );
    }, 500); // Wait to close Decrypt Password modal
  };

  const onSubmitPassword = async (password: string) => {
    if (key) {
      try {
        key.decrypt(password);
        logger.debug('Key Decrypted');
        await dispatch(
          WalletActions.successEncryptOrDecryptPassword({
            key,
          }),
        );
        setPasswordToggle(false);
        dispatch(AppActions.dissmissDecryptPasswordModal());
      } catch (e) {
        console.log(`Decrypt Error: ${e}`);
        await dispatch(AppActions.dissmissDecryptPasswordModal());
        wrongPasswordErr();
      }
    } else {
      dispatch(AppActions.dissmissDecryptPasswordModal());
      generalError();
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
              contextHandler: onSubmitPassword,
            }),
          );
        }
      }}
      isEnabled={passwordToggle}
    />
  );
};

export default RequestEncryptPasswordToggle;
