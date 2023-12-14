import {useNavigation, useRoute} from '@react-navigation/native';
import React, {useLayoutEffect, useState} from 'react';
import {HeaderTitle, Paragraph, H5} from '../../../components/styled/Text';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import Clipboard from '@react-native-clipboard/clipboard';
import {useTranslation} from 'react-i18next';

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
  const {t} = useTranslation();
  const navigation = useNavigation();

  const {
    params: {xPrivKey},
  } = useRoute<RouteProp<WalletGroupParamList, 'ExtendedPrivateKey'>>();

  const [copied, setCopied] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Extended Private Key')}</HeaderTitle>,
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
        <Title>{t('Warning!')}</Title>
        <ExtendedPrivateKeyParagraph>
          {t(
            'Your extended private keys are all that is needed to access your funds. Be sure to protect your private keys and store them only on secure devices. BitPay does not have access to your private keys, so you alone are responsible for your keys. If you share key access with external services, you take responsibility for the risk of theft or breach. Only advanced users should handle extended private keys directly.',
          )}
        </ExtendedPrivateKeyParagraph>

        <Button onPress={copyXPrivKey}>
          {!copied ? t('Copy to Clipboard') : t('Copied!')}
        </Button>
      </ScrollView>
    </ExtendedPrivateKeyContainer>
  );
};

export default ExtendedPrivateKey;
