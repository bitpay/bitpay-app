import React, {useLayoutEffect, useMemo, useRef, useState} from 'react';
import RNFS from 'react-native-fs';
import {Platform, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ShareOptions} from 'react-native-share';
import {useTheme} from '../../../contexts';
import {
  BaseText,
  HeaderTitle,
  HeaderSubtitle,
  Paragraph,
} from '../../../components/styled/Text';
import Button from '../../../components/button/Button';
import {ActiveOpacity} from '../../../components/styled/Containers';
import {
  Caution,
  Caution25,
  Caution60,
  LightBlack,
  SlateDark,
} from '../../../styles/colors';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import haptic from '../../../components/haptic-feedback/haptic';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {Key} from '../../../store/wallet/wallet.models';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {backupRedirect} from './Backup';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import Back from '../../../components/back/Back';
import {IS_ANDROID} from '../../../constants';
import {sleep} from '../../../utils/helper-methods';
import {shareFile} from '../../../utils/share';
import {CustomErrorMessage} from '../components/ErrorMessages';
import Blur from '../../../components/blur/Blur';
import {useBackupColors} from '../../../components/backup/colors';
import {EyeGlyph, PrintGlyph} from '../../../components/backup/glyphs';
import {BackupMethodCard} from '../../../components/backup/BackupCards';
import {PhraseCell} from '../../../components/backup/PhraseCell';

type RecoveryPhraseScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
  WalletScreens.RECOVERY_PHRASE
>;

export interface RecoveryPhraseParamList {
  keyId: string;
  words: string[];
  context?: string;
  key?: Key;
  walletTermsAccepted: boolean;
  mode?: 'view' | 'privateKey';
  xPrivKey?: string;
}

const TEMPLATE_FILE = 'bitpay-recovery-phrase-template.pdf';

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {gap: 12, paddingTop: 10, paddingHorizontal: 12, paddingBottom: 20},
  privateKeyContent: {gap: 12, paddingVertical: 20, paddingHorizontal: 15},
  paragraph: {fontSize: 16, lineHeight: 25},
  grid: {gap: 6},
  gridRow: {flexDirection: 'row', gap: 6},
  hiddenGrid: {borderRadius: 10, overflow: 'hidden'},
  reveal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  revealTitle: {fontSize: 16, fontWeight: '600'},
  revealSubtitle: {fontSize: 13},
  footer: {paddingHorizontal: 12, paddingTop: 12},
  warning: {
    alignItems: 'center',
    gap: 5,
    backgroundColor: Caution25,
    borderRadius: 8,
    padding: 10,
  },
  warningLine: {fontSize: 14, lineHeight: 20, textAlign: 'center'},
  privateKey: {
    borderRadius: 8,
    padding: 16,
    fontFamily: Platform.select({ios: 'Menlo', default: 'monospace'}),
    fontSize: 14,
    lineHeight: 22,
  },
});

const RecoveryPhrase = ({navigation, route}: RecoveryPhraseScreenProps) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const theme = useTheme();
  const colors = useBackupColors();
  const {params} = route;
  const walletTermsAccepted = useAppSelector(
    ({WALLET}) => WALLET.walletTermsAccepted,
  );
  const storedKey = useAppSelector(({WALLET}) => WALLET.keys[params.keyId]);
  const {words, context, mode, xPrivKey} = params;
  const key = params.key ?? storedKey;
  const isBackup = !mode;
  const [revealed, setRevealed] = useState(!isBackup);

  const showError = async () => {
    await sleep(500);
    dispatch(
      showBottomNotificationModal(
        CustomErrorMessage({
          errMsg: t('The file could not be shared'),
          title: t('Uh oh, something went wrong'),
        }),
      ),
    );
  };

  const printBackupTemplate = async () => {
    haptic('impactLight');
    let sourceStoragePath = RNFS.MainBundlePath;
    if (Platform.OS !== 'ios') {
      // Android bundles the PDF in android/app/src/main/assets; it has to be copied out before sharing.
      try {
        await RNFS.copyFileAssets(
          TEMPLATE_FILE,
          `${RNFS.CachesDirectoryPath}/${TEMPLATE_FILE}`,
        );
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
        logger.error(
          `Failed trying to execute RNFS.copyFileAssets. Error: ${errMsg}`,
        );
        await showError();
        return;
      }
      sourceStoragePath = RNFS.CachesDirectoryPath;
    }
    try {
      const opts: ShareOptions = {
        title: t('BitPay Backup Template'),
        url: `file://${sourceStoragePath}/${TEMPLATE_FILE}`,
        type: 'application/pdf',
        subject: 'BitPay Backup Template',
        failOnCancel: false,
      };
      dispatch(shareFile(opts));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logger.error(`Failed trying to execute Share.open. Error: ${errMsg}`);
      await showError();
    }
  };

  const onPressHeaderBack = () => {
    haptic('impactLight');

    if (!isBackup || context === 'settings' || key?.backupComplete) {
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
  const onPressHeaderBackRef = useRef(onPressHeaderBack);
  useLayoutEffect(() => {
    onPressHeaderBackRef.current = onPressHeaderBack;
  });

  const headerTitle = useMemo(() => {
    return () => (
      <HeaderTitle>
        {mode === 'privateKey' ? t('Private Key') : t('Recovery Phrase')}
      </HeaderTitle>
    );
  }, [mode, t]);

  const headerLeft = useMemo(() => {
    return () => (
      <TouchableOpacity
        touchableLibrary={'react-native-gesture-handler'}
        testID="cancel-button"
        accessibilityLabel={t('Back')}
        style={{marginLeft: IS_ANDROID ? 10 : 0}}
        activeOpacity={ActiveOpacity}
        onPress={() => onPressHeaderBackRef.current()}>
        <Back opacity={1} />
      </TouchableOpacity>
    );
  }, [t]);

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: !isBackup,
      headerTitle,
      headerLeft,
    });
  }, [navigation, headerTitle, headerLeft, isBackup]);

  const next = () => {
    navigation.navigate('VerifyPhrase', {...params, walletTermsAccepted});
  };

  const wordRows = useMemo(
    () =>
      Array.from({length: Math.ceil(words.length / 2)}, (_, row) =>
        words.slice(row * 2, row * 2 + 2),
      ),
    [words],
  );

  if (mode === 'privateKey') {
    return (
      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.privateKeyContent}>
          <View style={styles.warning}>
            <HeaderSubtitle style={{color: theme.dark ? Caution : Caution60}}>
              {t('CONFIDENTIAL')}
            </HeaderSubtitle>
            <Paragraph style={{color: theme.dark ? SlateDark : LightBlack}}>
              {t('Your extended private key')}
            </Paragraph>
            <BaseText
              style={[
                styles.warningLine,
                {color: theme.dark ? Caution60 : Caution},
              ]}>
              {t('Store Securely - Never share')}
            </BaseText>
          </View>
          <BaseText
            style={[styles.privateKey, {backgroundColor: colors.surfaceMuted}]}>
            {xPrivKey}
          </BaseText>
        </ScrollView>
        <View style={styles.footer}>
          <Button onPress={() => navigation.goBack()}>{t('Done')}</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['bottom']}
      style={styles.container}
      testID="recovery-phrase-view">
      <ScrollView contentContainerStyle={styles.content}>
        <BaseText style={[styles.paragraph, {color: colors.textDescription}]}>
          {t(
            'Write these {{wordCount}} words on paper, in order. Never share them. BitPay will never ask for them.',
            {wordCount: words.length},
          )}
        </BaseText>
        <View style={revealed ? null : styles.hiddenGrid}>
          <View
            style={styles.grid}
            accessibilityElementsHidden={!revealed}
            importantForAccessibility={
              revealed ? 'auto' : 'no-hide-descendants'
            }>
            {wordRows.map((pair, row) => (
              <View key={row} style={styles.gridRow}>
                {pair.map((word, column) => (
                  <PhraseCell key={column} n={row * 2 + column + 1} tone="word">
                    {word}
                  </PhraseCell>
                ))}
              </View>
            ))}
          </View>
          {revealed ? null : (
            <>
              <Blur />
              <Pressable
                testID="reveal-button"
                accessibilityRole="button"
                accessibilityLabel={t('Tap to reveal')}
                onPress={() => setRevealed(true)}
                style={styles.reveal}>
                <EyeGlyph color={colors.textPrimary} />
                <BaseText style={styles.revealTitle}>
                  {t('Tap to reveal')}
                </BaseText>
                <BaseText
                  style={[
                    styles.revealSubtitle,
                    {color: colors.textDescription},
                  ]}>
                  {t('Make sure no one can see your screen')}
                </BaseText>
              </Pressable>
            </>
          )}
        </View>
        {isBackup && revealed ? (
          <Button
            buttonType={'link'}
            accessibilityLabel={t('Hide')}
            onPress={() => setRevealed(false)}>
            {t('Hide')}
          </Button>
        ) : null}
        <BackupMethodCard
          testID="print-backup-button"
          icon={<PrintGlyph color={colors.iconButtonGlyph} />}
          title={t('Print recovery template')}
          description={t(
            'A blank sheet to write your phrase on and store somewhere safe.',
          )}
          onPress={printBackupTemplate}
        />
      </ScrollView>
      <View style={styles.footer}>
        {isBackup ? (
          <Button
            testID="next-button"
            accessibilityLabel={t('I Wrote It Down')}
            buttonStyle={'primary'}
            debounceTime={Platform.OS === 'android' ? 200 : 0}
            disabled={!revealed}
            onPress={next}>
            {t('I Wrote It Down')}
          </Button>
        ) : (
          <Button onPress={() => navigation.goBack()}>{t('Done')}</Button>
        )}
      </View>
    </SafeAreaView>
  );
};

export default RecoveryPhrase;
