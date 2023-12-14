import React, {useLayoutEffect} from 'react';
import {Paragraph, HeaderTitle, H6} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../components/styled/Containers';
import {SlateDark, White} from '../../../styles/colors';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import QRCode from 'react-native-qrcode-svg';
import {useTranslation} from 'react-i18next';

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
  const {t} = useTranslation();
  const {
    params: {code, keyName},
  } = useRoute<RouteProp<WalletGroupParamList, 'ExportKey'>>();

  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Export Key')}</HeaderTitle>,
    });
  }, [navigation, t]);

  return (
    <ExportKeyContainer>
      <ScrollView>
        <ExportKeyParagraph>
          {t(
            'Your wallet is all that is needed to access your funds. Be sure to protect your wallet and store it only on secure devices. BitPay does not have access to your recovery phrase, so you alone are responsible for your wallets. If you share wallet access with external services, you take responsibility for the risk of theft or breach.',
          )}
        </ExportKeyParagraph>

        <ExportKeyParagraph>
          {t(
            'You can import this wallet into other devices through the BitPay scanner.',
          )}
        </ExportKeyParagraph>

        <QRCodeContainer>
          <QRBackground>
            <QRCode value={code} size={200} />
          </QRBackground>

          <KeyName>{keyName || 'My Key'}</KeyName>
        </QRCodeContainer>
      </ScrollView>
    </ExportKeyContainer>
  );
};

export default ExportKey;
