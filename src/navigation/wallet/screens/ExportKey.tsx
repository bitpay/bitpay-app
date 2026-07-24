import React, {useLayoutEffect} from 'react';
import {SafeAreaView, ScrollView, StyleSheet, View} from 'react-native';
import {Paragraph, HeaderTitle, H6, H5} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTheme} from '../../../contexts';
import {SlateDark, White} from '../../../styles/colors';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import QRCode from 'react-native-qrcode-svg';
import {useTranslation} from 'react-i18next';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    marginTop: 20,
    paddingHorizontal: 12,
  },
  title: {
    color: '#ce334b',
    marginBottom: 15,
  },
  paragraph: {
    marginBottom: 15,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  qrBackground: {
    width: 225,
    height: 225,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: White,
    borderRadius: 12,
  },
  keyName: {
    marginTop: 10,
  },
});

const ExportKey = () => {
  const {t} = useTranslation();
  const {
    params: {code, keyName},
  } = useRoute<RouteProp<WalletGroupParamList, 'ExportKey'>>();

  const navigation = useNavigation();
  const theme = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Export Key')}</HeaderTitle>,
    });
  }, [navigation, t]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <H5 style={styles.title}>{t('Warning!')}</H5>
        <Paragraph
          style={[styles.paragraph, {color: theme.dark ? White : SlateDark}]}>
          {t(
            'Your wallet is all that is needed to access your funds. Be sure to protect your wallet and store it only on secure devices. BitPay does not have access to your recovery phrase, so you alone are responsible for your wallets. If you share wallet access with external services, you take responsibility for the risk of theft or breach.',
          )}
        </Paragraph>

        <Paragraph
          style={[styles.paragraph, {color: theme.dark ? White : SlateDark}]}>
          {t(
            'You can import this wallet into other devices through the BitPay scanner.',
          )}
        </Paragraph>

        <View style={styles.qrCodeContainer}>
          <View style={styles.qrBackground}>
            <QRCode value={code} size={200} />
          </View>

          <H6 style={styles.keyName}>{keyName || 'My Key'}</H6>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ExportKey;
