import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StackActions, useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {useHeaderHeight} from '@react-navigation/elements';
import {useTranslation} from 'react-i18next';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import BoxInput from '../../../components/form/BoxInput';
import Button from '../../../components/button/Button';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {sleep} from '../../../utils/helper-methods';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {startCloudBackup} from '../../../store/wallet/effects/cloud-backup/cloud-backup';
import {
  CloudBackupError,
  CloudBackupErrorReason,
  connectToCloud,
} from '../../../utils/cloud-backup/storage';
import {checkCloudBackupPassword} from '../../../utils/cloud-backup/password';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {logManager} from '../../../managers/LogManager';
import {navigationRef} from '../../../Root';
import {useBackupColors} from '../../../components/backup/colors';
import {
  PasswordStrength,
  getPasswordStrength,
} from '../../../components/backup/PasswordStrength';
import {BusyOverlay} from '../../../components/backup/BrandLoader';
import {ResultView} from '../../../components/backup/ResultView';
import {showTopToast} from '../../../components/backup/TopToast';
import {backupRedirect} from './Backup';
import {useBackupPasswordLockout} from '../components/CloudRestore';
import {WalletGroupParamList} from '../WalletGroup';

export type CloudBackupPasswordMode = 'create' | 'again' | 'change';

export interface CloudBackupPasswordParamList {
  keyId: string;
  words: string[];
  mode: CloudBackupPasswordMode;
  context?: string;
}

const TOAST_DURATION_MS = 2600;

const KEY_CREATION_CONTEXTS: Array<string | undefined> = [
  'onboarding',
  'createNewKey',
  'createNewMultisigKey',
];

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {gap: 18, paddingTop: 10, paddingHorizontal: 12, paddingBottom: 20},
  paragraph: {fontSize: 16, lineHeight: 25},
  note: {fontSize: 14, lineHeight: 20},
  footer: {paddingHorizontal: 12, paddingTop: 12},
});

const CloudBackupPassword = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const colors = useBackupColors();
  const headerHeight = useHeaderHeight();
  const {
    params: {keyId, words, mode, context},
  } = useRoute<RouteProp<WalletGroupParamList, 'CloudBackupPassword'>>();
  const key = useAppSelector(({WALLET}) => WALLET.keys[keyId]);
  const walletTermsAccepted = useAppSelector(
    ({WALLET}) => WALLET.walletTermsAccepted,
  );
  const isIOS = Platform.OS === 'ios';
  const cloudName = isIOS ? 'iCloud' : 'Google Drive';
  const confirmPasswordRef = useRef<TextInput>(null);
  const [passwordMode, setPasswordMode] = useState<'create' | 'enter'>(
    mode === 'again' ? 'enter' : 'create',
  );
  const creating = passwordMode === 'create';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string>();
  const [confirmError, setConfirmError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [failure, setFailure] = useState<CloudBackupErrorReason | null>(null);
  const {
    locked: lockedOut,
    lockMessage: lockedOutMessage,
    registerWrongPassword,
    resetWrongPasswords,
  } = useBackupPasswordLockout();
  const locked = lockedOut && !creating;
  const lockMessage = creating ? undefined : lockedOutMessage;

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'inactive' || state === 'background') {
        setPassword('');
        setConfirmPassword('');
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', event => {
        const {type} = event.data.action;
        if (!failure || (type !== 'GO_BACK' && type !== 'POP')) {
          return;
        }
        event.preventDefault();
        setFailure(null);
      }),
    [navigation, failure],
  );

  const headerTitle = useMemo(() => {
    return () => (
      <HeaderTitle>
        {failure
          ? ''
          : mode === 'change'
          ? t('Change Backup Password')
          : creating
          ? t('Create Backup Password')
          : t('Enter Backup Password')}
      </HeaderTitle>
    );
  }, [creating, failure, mode, t]);

  useLayoutEffect(() => {
    navigation.setOptions({headerTitle});
  }, [navigation, headerTitle]);

  const recoveryPhraseParams = {
    keyId,
    words,
    walletTermsAccepted: true,
    context,
  };

  const finishBackup = () =>
    KEY_CREATION_CONTEXTS.includes(context)
      ? backupRedirect({
          context,
          navigation,
          walletTermsAccepted,
          key: {...key, backupComplete: true},
        })
      : navigation.dispatch(StackActions.pop(2));

  const offerWriteItDown = () =>
    dispatch(
      showBottomNotificationModal({
        type: 'success',
        title: t('Backup complete'),
        message: t(
          'Your recovery phrase is encrypted and saved to {{cloudName}}. Would you also like to write it down?',
          {cloudName},
        ),
        enableBackdropDismiss: true,
        actions: [
          {text: t('Done'), action: () => {}, primary: true},
          {
            text: t('Write It Down'),
            action: () =>
              navigationRef.navigate('RecoveryPhrase', recoveryPhraseParams),
          },
        ],
      }),
    );

  const saveBackup = async () => {
    if (savingRef.current) {
      return;
    }
    savingRef.current = true;
    try {
      await saveAndConfirmBackup();
    } finally {
      savingRef.current = false;
    }
  };

  const saveAndConfirmBackup = async () => {
    Keyboard.dismiss();
    dispatch(Analytics.track('Cloud Backup Started', {mode}));
    setSaving(true);
    try {
      if (!creating) {
        await connectToCloud();
        const check = await checkCloudBackupPassword(
          password,
          key.properties?.fingerPrint || key.id,
        );
        if (check !== 'match') {
          setSaving(false);
          if (check === 'wrong') {
            registerWrongPassword();
            setPasswordError(t('Incorrect password, try again'));
          } else {
            setPasswordMode('create');
          }
          return;
        }
        resetWrongPasswords();
      }
      await dispatch(
        startCloudBackup({
          key,
          words,
          password,
          revokeOlder: mode === 'change',
        }),
      );
      setSaving(false);
      dispatch(Analytics.track('Cloud Backup Completed', {mode}));
      await sleep(500);
      if (!navigation.isFocused()) {
        return;
      }
      finishBackup();
      showTopToast({
        text: t('Cloud backup completed.'),
        kind: 'ok',
        durationMs: TOAST_DURATION_MS,
      });
      await sleep(TOAST_DURATION_MS);
      offerWriteItDown();
    } catch (err) {
      setSaving(false);
      const reason = err instanceof CloudBackupError ? err.reason : 'unknown';
      dispatch(Analytics.track('Cloud Backup Failed', {mode, reason}));
      logManager.error(`[CloudBackup] backup failed: ${reason}`);
      if (reason !== 'cancelled') {
        setFailure(reason);
      }
    }
  };

  const onSubmit = () => {
    if (locked) {
      return;
    }
    if (!password) {
      setPasswordError(t('Required'));
      return;
    }
    if (creating && getPasswordStrength(password).level !== 3) {
      setPasswordError(t('Choose a stronger password'));
      return;
    }
    if (creating && password !== confirmPassword) {
      setConfirmError(t('Passwords don’t match'));
      return;
    }
    saveBackup();
  };

  const writeItDownInstead = () => {
    dispatch(
      Analytics.track('Clicked Write It Down Instead', {reason: failure}),
    );
    navigation.dispatch(
      StackActions.replace('RecoveryPhrase', recoveryPhraseParams),
    );
  };

  const busyText = t(
    'Encrypting your recovery phrase and saving it to {{cloudName}}…',
    {cloudName},
  );

  const offline = failure === 'network';
  const storageFull = failure === 'storage_full';
  const unavailable = failure === 'unavailable';

  return (
    <>
      {failure ? (
        <ResultView
          tone={
            storageFull ? 'warn' : offline || unavailable ? 'neutral' : 'error'
          }
          icon={offline || unavailable ? 'cloud' : 'bang'}
          title={
            offline
              ? t('You’re offline')
              : storageFull
              ? t('{{cloudName}} storage is full', {
                  cloudName: isIOS ? 'iCloud' : 'Google',
                })
              : unavailable
              ? isIOS
                ? t('Turn on iCloud Drive')
                : t('Sign in to {{cloudName}}', {cloudName})
              : t('Backup failed')
          }
          message={
            offline
              ? t(
                  'Connect to the internet and try again. Your key is still safe on this phone.',
                )
              : storageFull
              ? isIOS
                ? t(
                    'Free up space in iCloud, then try again. The backup is very small.',
                  )
                : t(
                    'Free up space in your Google account, then try again. The backup is very small.',
                  )
              : unavailable
              ? isIOS
                ? t(
                    'Open the Settings app, tap your name, then iCloud, and turn on iCloud Drive. Make sure BitPay is allowed to use it, then come back and try again.',
                  )
                : t(
                    'Sign in to {{cloudName}} on this device and allow BitPay to use it, then try again. You can also write down your recovery phrase instead.',
                    {cloudName},
                  )
              : t(
                  "We couldn't confirm your backup in {{cloudName}}. Check your internet connection and try again.",
                  {cloudName},
                )
          }
          primary={t('Try Again')}
          onPrimary={() => {
            setFailure(null);
            onSubmit();
          }}
          link={t('Use Manual Backup Instead')}
          onLink={writeItDownInstead}
        />
      ) : (
        <SafeAreaView edges={['bottom']} style={styles.container}>
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={headerHeight}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.content}>
              <BaseText
                style={[styles.paragraph, {color: colors.textDescription}]}>
                {creating
                  ? t(
                      'You’ll need it to restore from {{cloudName}}. BitPay can’t reset it.',
                      {cloudName},
                    )
                  : t(
                      'Use the password you chose when you backed up this key to {{cloudName}}.',
                      {cloudName},
                    )}
              </BaseText>
              <BoxInput
                testID="cloud-backup-password-input"
                label={t('PASSWORD')}
                type={'password'}
                textContentType={creating ? 'newPassword' : 'password'}
                autoComplete={creating ? 'password-new' : 'password'}
                value={password}
                disabled={locked}
                onChangeText={(text: string) => {
                  setPassword(text);
                  setPasswordError(undefined);
                }}
                error={lockMessage || passwordError}
                returnKeyType={creating ? 'next' : 'done'}
                onSubmitEditing={() =>
                  creating ? confirmPasswordRef.current?.focus() : onSubmit()
                }
                blurOnSubmit={!creating}
              />
              {creating && password ? (
                <PasswordStrength value={password} />
              ) : null}
              {creating ? (
                <BoxInput
                  testID="cloud-backup-confirm-password-input"
                  ref={confirmPasswordRef}
                  label={t('CONFIRM PASSWORD')}
                  type={'password'}
                  textContentType={'newPassword'}
                  autoComplete={'password-new'}
                  value={confirmPassword}
                  onChangeText={(text: string) => {
                    setConfirmPassword(text);
                    setConfirmError(undefined);
                  }}
                  error={confirmError}
                  onSubmitEditing={onSubmit}
                />
              ) : null}
              {creating ? null : (
                <BaseText
                  style={[styles.note, {color: colors.textDescription}]}>
                  {t(
                    'You’ll need it to restore from {{cloudName}}. BitPay can’t reset it.',
                    {cloudName},
                  )}
                </BaseText>
              )}
              <BaseText style={[styles.note, {color: colors.textDescription}]}>
                {t(
                  'Anyone with your {{cloudName}} account and this password can get to your funds.',
                  {cloudName},
                )}
              </BaseText>
              {creating ? (
                <BaseText
                  style={[styles.note, {color: colors.textDescription}]}>
                  {t('Forgot it later? Your 12 words still work.')}
                </BaseText>
              ) : null}
              {key?.properties?.mnemonicHasPassphrase ? (
                <BaseText
                  style={[styles.note, {color: colors.textDescription}]}>
                  {t(
                    'The backup doesn’t include this key’s recovery phrase password. You’ll need it to restore.',
                  )}
                </BaseText>
              ) : null}
              <BaseText style={[styles.note, {color: colors.textDescription}]}>
                {t(
                  'Don’t rename or move the BitPay backup in {{cloudName}}, or we won’t be able to find it.',
                  {cloudName},
                )}
              </BaseText>
            </ScrollView>
            <View style={styles.footer}>
              <Button
                testID="cloud-backup-save-button"
                accessibilityLabel={creating ? t('Save Backup') : t('Back Up')}
                disabled={locked}
                onPress={onSubmit}>
                {creating ? t('Save Backup') : t('Back Up')}
              </Button>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      )}
      <BusyOverlay visible={saving} text={busyText} />
    </>
  );
};

export default CloudBackupPassword;
