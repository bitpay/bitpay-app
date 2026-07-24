import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {useTheme} from '../../../contexts';
import {
  BaseText,
  HeaderTitle,
  HeaderSubtitle,
  Paragraph,
} from '../../../components/styled/Text';
import Button from '../../../components/button/Button';
import {
  ActiveOpacity,
  CTA_RESERVED,
  CtaContainerAbsolute,
} from '../../../components/styled/Containers';
import {
  Caution,
  Caution25,
  Caution60,
  Grey,
  LightBlack,
  Slate,
  SlateDark,
} from '../../../styles/colors';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import haptic from '../../../components/haptic-feedback/haptic';
import {useDispatch} from 'react-redux';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {Key} from '../../../store/wallet/wallet.models';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {backupRedirect} from './Backup';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useAppSelector} from '../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import Back from '../../../components/back/Back';
import {IS_ANDROID} from '../../../constants';

type RecoveryPhraseScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
  WalletScreens.RECOVERY_PHRASE
>;

export interface RecoveryPhraseParamList {
  keyId: string;
  words: string[];
  context: string;
  key: Key;
  walletTermsAccepted: boolean;
}

const styles = StyleSheet.create({
  recoveryPhraseContainer: {
    flex: 1,
  },
  recoveryContainer: {
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  wordPairContainer: {
    marginTop: 30,
    marginRight: 15,
    marginBottom: 15,
    marginLeft: 20,
  },
  wordPairLine: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  wordPairColumn: {
    flex: 1,
    flexDirection: 'row',
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  wordText: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '400',
  },
  wordTextIndex: {
    fontSize: 16,
    width: 30,
  },
  warningMessageContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: Caution25,
    borderRadius: 8,
    padding: 10,
    width: '100%',
  },
  warningMessageTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningMessageDescContainer: {
    flex: 1,
    marginTop: 5,
  },
  warningMessageTextContainer: {
    flex: 1,
    marginTop: 5,
  },
});

const RecoveryPhrase = ({navigation, route}: RecoveryPhraseScreenProps) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const {params} = route;
  const walletTermsAccepted = useAppSelector(
    ({WALLET}) => WALLET.walletTermsAccepted,
  );
  const {words, context, key} = params;

  const renderWordPairs = () => {
    const wordPairs = [];

    for (let i = 0; i < words.length; i += 2) {
      const word1 = words[i];
      const word2 = words[i + 1];
      const index1 = i + 1;
      const index2 = i + 2;

      wordPairs.push(
        <View
          key={i}
          style={[
            styles.wordPairLine,
            {borderBottomColor: theme.dark ? SlateDark : Grey},
          ]}>
          <View style={styles.wordPairColumn}>
            <BaseText
              style={[
                styles.wordTextIndex,
                {color: theme.dark ? SlateDark : Slate},
              ]}>
              {index1}.
            </BaseText>
            <BaseText style={styles.wordText}>{word1}</BaseText>
          </View>
          {word2 && (
            <View style={styles.wordPairColumn}>
              <BaseText
                style={[
                  styles.wordTextIndex,
                  {color: theme.dark ? SlateDark : Slate},
                ]}>
                {index2}.
              </BaseText>
              <BaseText style={styles.wordText}>{word2}</BaseText>
            </View>
          )}
        </View>,
      );
    }

    return wordPairs;
  };

  const onPressHeaderCancel = () => {
    haptic('impactLight');

    if (context === 'settings' || key.backupComplete) {
      navigation.goBack();
      return;
    }

    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: t("Don't risk losing your money"),
        message: t(
          'Your recovery key is composed of 12 randomly selected words. Take a couple of minutes to carefully write down each word in the order they appear.',
        ),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t("I'M SURE"),
            action: () =>
              backupRedirect({
                context,
                navigation,
                walletTermsAccepted,
                key,
              }),
            primary: true,
          },
        ],
      }),
    );
  };
  const onPressHeaderCancelRef = useRef(onPressHeaderCancel);
  onPressHeaderCancelRef.current = onPressHeaderCancel;

  const headerTitle = useMemo(() => {
    return () => <HeaderTitle>{t('Recovery Phrase')}</HeaderTitle>;
  }, [t]);

  const headerLeft = useMemo(() => {
    return () => (
      <TouchableOpacity
        touchableLibrary={'react-native-gesture-handler'}
        testID="cancel-button"
        accessibilityLabel="Cancel"
        style={{marginLeft: IS_ANDROID ? 10 : 0}}
        activeOpacity={ActiveOpacity}
        onPress={onPressHeaderCancelRef.current}>
        <Back opacity={1} />
      </TouchableOpacity>
    );
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle,
      headerLeft,
    });
  }, [navigation, headerTitle, headerLeft]);

  const next = () => {
    navigation.navigate('VerifyPhrase', {...params, walletTermsAccepted});
  };

  return (
    <SafeAreaView
      style={styles.recoveryPhraseContainer}
      testID="recovery-phrase-view">
      <ScrollView
        style={styles.recoveryContainer}
        contentContainerStyle={{
          paddingBottom: CTA_RESERVED,
        }}>
        <View style={styles.warningMessageContainer}>
          <View style={styles.warningMessageTitleContainer}>
            <HeaderSubtitle style={{color: theme.dark ? Caution : Caution60}}>
              {t('CONFIDENTIAL')}
            </HeaderSubtitle>
          </View>
          <View style={styles.warningMessageDescContainer}>
            <Paragraph style={{color: theme.dark ? SlateDark : LightBlack}}>
              {t('Your 12-word recovery phrase')}
            </Paragraph>
          </View>
          <View style={styles.warningMessageTextContainer}>
            <BaseText style={{color: theme.dark ? Caution60 : Caution}}>
              {t('Store Securely - Never share')}
            </BaseText>
          </View>
        </View>

        <View style={styles.wordPairContainer}>{renderWordPairs()}</View>
      </ScrollView>
      <CtaContainerAbsolute testID="cta-container">
        <Button
          testID="next-button"
          accessibilityLabel="Verify recovery phrase"
          buttonStyle={'primary'}
          debounceTime={Platform.OS === 'android' ? 200 : 0}
          disabled={key.backupComplete}
          onPress={next}>
          {key.backupComplete ? t('Verified') : t('Verify')}
        </Button>
      </CtaContainerAbsolute>
    </SafeAreaView>
  );
};

export default RecoveryPhrase;
