import React from 'react';
import {Pressable, SafeAreaView, ScrollView, StyleSheet} from 'react-native';
import {useTheme} from '../../../contexts';
import {
  ActionContainer,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {Link, Paragraph} from '../../../components/styled/Text';
import {SlateDark, White} from '../../../styles/colors';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';

import {URL} from '../../../constants';
import {useAppDispatch} from '../../../utils/hooks';
import Button from '../../../components/button/Button';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import {useTranslation} from 'react-i18next';

export type ClearEncryptPasswordParamList = {
  keyId: string;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    marginTop: 20,
    paddingHorizontal: ScreenGutter,
  },
  paragraph: {
    marginBottom: 15,
  },
  link: {
    fontSize: 16,
    fontStyle: 'normal',
  },
  linkPressable: {
    maxHeight: 22,
    alignSelf: 'flex-start',
  },
});

const ClearEncryptPassword = () => {
  const {t} = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {
    params: {keyId},
  } = useRoute<RouteProp<WalletGroupParamList, 'ClearEncryptPassword'>>();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Paragraph
          style={[styles.paragraph, {color: theme.dark ? White : SlateDark}]}>
          {t(
            'Because your encrypted password is not stored by BitPay, there is no way to reset it.',
          )}
        </Paragraph>
        <Paragraph
          style={[styles.paragraph, {color: theme.dark ? White : SlateDark}]}>
          {t(
            'If you need to regain access to your wallet because you have forgotten or lost the encrypt password, you must restore the wallet using the 12 word recovery phrase.',
          )}
        </Paragraph>
        <Paragraph
          style={[styles.paragraph, {color: theme.dark ? White : SlateDark}]}>
          {t(
            'If you do not have the recovery phrase, you will not be able to regain access to your wallet',
          )}{' '}
          <Pressable
            style={styles.linkPressable}
            onPress={() =>
              dispatch(
                openUrlWithInAppBrowser(
                  URL.HELP_FORGOT_WALLET_ENCRYPT_PASSWORD,
                ),
              )
            }>
            <Link style={styles.link}>{t('Read more.')}</Link>
          </Pressable>
        </Paragraph>

        <ActionContainer>
          <Button
            onPress={() => {
              navigation.navigate('Import', {keyId});
            }}>
            {t('Continue')}
          </Button>
        </ActionContainer>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ClearEncryptPassword;
