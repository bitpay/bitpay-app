import {useNavigation, useRoute} from '@react-navigation/native';
import React, {useLayoutEffect, useState} from 'react';
import {HeaderTitle, Paragraph, H5} from '../../../components/styled/Text';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {useDispatch} from 'react-redux';
import {AppActions} from '../../../store/app';
import {
  GeneralError,
  WrongPasswordError,
} from '../components/ErrorMessages';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {useLogger} from '../../../utils/hooks';
import Clipboard from '@react-native-community/clipboard';

const ExtendedPrivateKeyContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const Title = styled(H5)`
  color: #ce334b;
`;

const ExtendedPrivateKeyParagraph = styled(Paragraph)`
  margin: 15px 0 20px;
`;

const ExtendedPrivateKey = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const logger = useLogger();

  const {
    params: {key},
  } = useRoute<RouteProp<WalletStackParamList, 'CreateEncryptPassword'>>();

  const getInitKey = () => {
    if (!key.isPrivKeyEncrypted) {
      return key.properties.xPrivKey;
    }
    return '';
  };

  const [copied, setCopied] = useState(false);
  let [xPrivKey, setXPrivKey] = useState(getInitKey());

  const showErrorMessage = (msg: BottomNotificationConfig) => {
    setTimeout(() => {
      dispatch(showBottomNotificationModal(msg));
    }, 500); // Wait to close Decrypt Password modal
  };

  const onSubmitPassword = async (password: string) => {
    if (password) {
      try {
        const getKey = key.methods.get(password);
        setXPrivKey(getKey.xPrivKey);
        dispatch(AppActions.dismissDecryptPasswordModal());
      } catch (e) {
        console.log(`Decrypt Error: ${e}`);
        await dispatch(AppActions.dismissDecryptPasswordModal());
        navigation.goBack();
        showErrorMessage(WrongPasswordError());
      }
    } else {
      dispatch(AppActions.dismissDecryptPasswordModal());
      navigation.goBack();
      showErrorMessage(GeneralError);
      logger.debug('Missing Key Error');
    }
  };

  if (key.isPrivKeyEncrypted && !xPrivKey) {
    setTimeout(() => {
      dispatch(
        AppActions.showDecryptPasswordModal({
          onSubmitHandler: onSubmitPassword,
          description:
            'An encryption password is required when you’re sending crypto or managing settings. If you would like to disable this, go to your wallet settings.',
          onCancelHandler: () => {
            navigation.goBack();
          },
        }),
      );
    }, 200); // Wait for screen animation
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>Extended Private Key</HeaderTitle>,
    });
  });

  const copyXPrivKey = () => {
    if (!xPrivKey || copied) {
      return;
    }
    Clipboard.setString(xPrivKey);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };

  return (
    <ExtendedPrivateKeyContainer>
      <ScrollView>
        <Title>Warning!</Title>
        <ExtendedPrivateKeyParagraph>
          Your extended private keys are all that is needed to access your
          funds. Be sure to protect your private keys and store them only on
          secure devices. BitPay does not have access to your private keys, so
          you alone are responsible for your keys. If you share key access with
          external services, you take responsibility for the risk of theft or
          breach. Only advanced users should handle extended private keys
          directly.
        </ExtendedPrivateKeyParagraph>

        <Button onPress={copyXPrivKey}>
          {!copied ? 'Copy to Clipboard' : 'Copied!'}
        </Button>
      </ScrollView>
    </ExtendedPrivateKeyContainer>
  );
};

export default ExtendedPrivateKey;
