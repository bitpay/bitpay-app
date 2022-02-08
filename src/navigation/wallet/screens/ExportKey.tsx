import React, {useLayoutEffect, useState} from 'react';
import {Paragraph, HeaderTitle, H6} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../components/styled/Containers';
import {SlateDark, White} from '../../../styles/colors';
import {useDispatch} from 'react-redux';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import QRCode from 'react-native-qrcode-svg';
import {AppActions} from '../../../store/app';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {useLogger} from '../../../utils/hooks/useLogger';
import {GeneralError, WrongPasswordError} from '../components/ErrorMessages';
import {sleep} from '../../../utils/helper-methods';

const ExportKeyContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const ExportKeyParagraph = styled(Paragraph)`
  margin-bottom: 15px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const QRCodeContainer = styled.View`
  align-items: center;
  margin: 20px 0;
`;

const QRBackground = styled.View`
  width: 225px;
  height: 225px;
  justify-content: center;
  align-items: center;
  background-color: ${White};
  border-radius: 12px;
`;

const KeyName = styled(H6)`
  margin-top: 10px;
`;

const ExportKey = () => {
  const {
    params: {key},
  } = useRoute<RouteProp<WalletStackParamList, 'ExportKey'>>();

  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>Export Key</HeaderTitle>,
    });
  }, [navigation]);

  const getInitialCode = () => {
    if (!key.isPrivKeyEncrypted) {
      const {mnemonic: getKeyMnemonic} = key.methods.get();
      return `1|${getKeyMnemonic}|null|null|${key.properties.mnemonic}|null`;
    }
    return '';
  };

  let [code, setCode] = useState(getInitialCode());
  const logger = useLogger();
  const dispatch = useDispatch();

  const onSubmitPassword = async (password: string) => {
    if (password) {
      try {
        const getKey = key.methods.get(password);
        setCode(
          `1|${getKey.mnemonic}|null|null|${key.properties.mnemonic}|null`,
        );
        dispatch(AppActions.dismissDecryptPasswordModal());
      } catch (e) {
        console.log(`Decrypt Error: ${e}`);
        await dispatch(AppActions.dismissDecryptPasswordModal());
        navigation.goBack();
        await sleep(500); // Wait to close Decrypt Password modal
        dispatch(showBottomNotificationModal(WrongPasswordError()));
      }
    } else {
      dispatch(AppActions.dismissDecryptPasswordModal());
      navigation.goBack();
      await sleep(500); // Wait to close Decrypt Password modal
      dispatch(showBottomNotificationModal(GeneralError));
      logger.debug('Missing Key Error');
    }
  };

  if (key.isPrivKeyEncrypted && !code) {
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

  return (
    <ExportKeyContainer>
      <ScrollView>
        <ExportKeyParagraph>
          Your wallet is all that is needed to access your funds. Be sure to
          protect your wallet and store it only on secure devices. BitPay does
          not have access to your recovery phrase, so you alone are responsible
          for your wallets. If you share wallet access with external services,
          you take responsibility for the risk of theft or breach.
        </ExportKeyParagraph>

        <ExportKeyParagraph>
          You can import this wallet into other devices through the BitPay
          scanner.
        </ExportKeyParagraph>

        <QRCodeContainer>
          <QRBackground>
            {code ? <QRCode value={code} size={200} /> : null}
          </QRBackground>

          {/*TODO: Update me*/}
          <KeyName>My Key</KeyName>
        </QRCodeContainer>
      </ScrollView>
    </ExportKeyContainer>
  );
};

export default ExportKey;
