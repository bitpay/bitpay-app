import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {Platform, ScrollView, StyleSheet, View} from 'react-native';
import moment from 'moment';
import Button from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import Banner from '../../../components/banner/Banner';
import {useTranslation} from 'react-i18next';
import {
  useAppDispatch,
  useLogger,
  useAppSelector,
  useMount,
} from '../../../utils/hooks';
import {StackActions, useNavigation, useRoute} from '@react-navigation/native';
import {
  checkEncryptedKeysForEddsaMigration,
  sleep,
} from '../../../utils/helper-methods';
import {AppActions} from '../../../store/app';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {WrongPasswordError} from '../components/ErrorMessages';
import {checkPrivateKeyEncrypted} from '../../../store/wallet/utils/wallet';
import {verifyIdentity} from '../../../store/wallet/effects/send/send';
import {isTSSKey} from '../../../store/wallet/effects/tss-send/tss-send';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {CloudBackupPasswordMode} from './CloudBackupPassword';
import {useBackupColors} from '../../../components/backup/colors';
import {CloudGlyph, PenGlyph} from '../../../components/backup/glyphs';
import {
  AdvancedMethods,
  BackupMethodCard,
  BannerLink,
} from '../../../components/backup/BackupCards';

export type BackupOnboardingParamList = {
  keyId: string;
  context?: string;
  viewRecoveryPhrase?: boolean;
};

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {gap: 14, paddingTop: 10, paddingHorizontal: 12, paddingBottom: 20},
  paragraph: {fontSize: 16, lineHeight: 25},
  sectionTitle: {fontSize: 18, lineHeight: 24, fontWeight: '700', marginTop: 6},
  banner: {marginTop: 6},
});

interface DecryptedKey {
  mnemonic: string;
  mnemonicHasPassphrase: boolean;
  xPrivKey: string;
}

const BackupOnboarding: React.FC = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const logger = useLogger();
  const colors = useBackupColors();
  const route = useRoute<RouteProp<WalletGroupParamList, 'BackupOnboarding'>>();
  const {keyId, context, viewRecoveryPhrase} = route.params;
  const key = useAppSelector(({WALLET}) => WALLET.keys[keyId]);
  const biometricLockActive = useAppSelector(
    ({APP}) => APP.biometricLockActive,
  );
  const pinLockActive = useAppSelector(({APP}) => APP.pinLockActive);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [identityVerified, setIdentityVerified] = useState(false);
  const pendingSecretOperation = useRef<symbol | undefined>(undefined);
  const hasAppLock = biometricLockActive || pinLockActive;
  const hasMnemonic = !!(
    key?.properties?.mnemonic || key?.properties?.mnemonicEncrypted
  );
  const cloudName = Platform.OS === 'ios' ? 'iCloud' : 'Google Drive';
  const canBackUpToCloud = hasMnemonic;
  const cloudBackedUp = canBackUpToCloud && !!key?.cloudBackupTimestamp;
  const manualBackedUp = !!key?.backupComplete && !key?.cloudBackupTimestamp;
  const hasPrivateKey = !!(
    key?.properties?.xPrivKey || key?.properties?.xPrivKeyEncrypted
  );
  const canOpen =
    !!key &&
    !key.isReadOnly &&
    !isTSSKey(key) &&
    !key.wallets?.some(wallet => wallet.pendingTssSession) &&
    (viewRecoveryPhrase ? hasMnemonic : hasMnemonic || hasPrivateKey);

  const headerTitle = useMemo(() => {
    return () => (
      <HeaderTitle>
        {viewRecoveryPhrase
          ? t('View Recovery Phrase')
          : hasMnemonic
          ? t('Back Up Recovery Phrase')
          : t('Backup')}
      </HeaderTitle>
    );
  }, [hasMnemonic, t, viewRecoveryPhrase]);

  useLayoutEffect(() => {
    navigation.setOptions({headerTitle});
  }, [navigation, headerTitle]);

  useEffect(() => {
    const cancelPendingOperation = () => {
      pendingSecretOperation.current = undefined;
    };
    const unsubscribe = navigation.addListener('blur', cancelPendingOperation);
    return () => {
      unsubscribe();
      cancelPendingOperation();
    };
  }, [navigation]);

  useEffect(() => {
    if (!canOpen) {
      navigation.goBack();
    }
  }, [canOpen, navigation]);

  const withDecryptedKey = (
    onDecrypted: (decrypted: DecryptedKey) => void,
    onCancel = () => {},
  ) => {
    if (!checkPrivateKeyEncrypted(key)) {
      onDecrypted({
        mnemonic: key.properties?.mnemonic || '',
        mnemonicHasPassphrase: !!key.properties?.mnemonicHasPassphrase,
        xPrivKey: key.properties?.xPrivKey || '',
      });
      return;
    }
    dispatch(
      AppActions.showDecryptPasswordModal({
        onSubmitHandler: async (encryptPassword: string) => {
          try {
            dispatch(checkEncryptedKeysForEddsaMigration(key, encryptPassword));
            const decryptedKey = key.methods!.get(encryptPassword);
            dispatch(AppActions.dismissDecryptPasswordModal());
            await sleep(300);
            onDecrypted(decryptedKey);
          } catch (err) {
            const errMessage =
              err instanceof Error ? err.message : JSON.stringify(err);
            logger.error(`[BackupOnboarding] Decrypt Error: ${errMessage}`);
            await dispatch(AppActions.dismissDecryptPasswordModal());
            await sleep(500);
            onCancel();
            dispatch(showBottomNotificationModal(WrongPasswordError()));
          }
        },
        description: t('To continue please enter your encryption password.'),
        onCancelHandler: onCancel,
      }),
    );
  };

  const openRecoveryPhrase = (
    words: string[],
    mode?: 'view' | 'privateKey',
    xPrivKey?: string,
  ) => {
    const params = {
      keyId,
      words,
      xPrivKey,
      context,
      mode,
      walletTermsAccepted: true,
    };
    if (viewRecoveryPhrase) {
      navigation.dispatch(StackActions.replace('RecoveryPhrase', params));
    } else {
      navigation.navigate('RecoveryPhrase', params);
    }
  };

  const onCloudBackupPress = (mode: CloudBackupPasswordMode) => {
    if (!identityVerified) {
      return;
    }
    haptic('impactLight');
    dispatch(Analytics.track('Clicked Cloud Backup', {mode}));
    withDecryptedKey(({mnemonic}) =>
      navigation.navigate('CloudBackupPassword', {
        keyId,
        words: mnemonic.trim().split(/[\u3000\s]+/),
        mode,
        context,
      }),
    );
  };

  const onManualBackupPress = () => {
    if (!identityVerified) {
      return;
    }
    haptic('impactLight');
    dispatch(Analytics.track('Clicked Write Down Backup'));
    withDecryptedKey(({mnemonic}) =>
      openRecoveryPhrase(mnemonic.trim().split(/[\u3000\s]+/)),
    );
  };

  const continueLabel = biometricLockActive
    ? t('Continue with Biometrics')
    : t('Continue with PIN');

  const viewSecret = (secret: 'phrase' | 'privateKey') => {
    if (!identityVerified && !viewRecoveryPhrase) {
      return;
    }
    const cancel = () => {
      pendingSecretOperation.current = undefined;
      if (viewRecoveryPhrase && navigation.isFocused()) {
        navigation.goBack();
      }
    };
    haptic('impactLight');
    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: t('Make sure no one can see your screen'),
        message:
          secret === 'phrase'
            ? t(
                'Anyone who sees your recovery phrase can take your funds. BitPay will never ask for it.',
              )
            : t(
                'Anyone who sees your private key can take your funds. BitPay will never ask for it.',
              ),
        enableBackdropDismiss: !viewRecoveryPhrase,
        actions: [
          {
            text: continueLabel,
            action: async () => {
              if (pendingSecretOperation.current || !navigation.isFocused()) {
                return;
              }
              const operation = Symbol();
              pendingSecretOperation.current = operation;
              const isCurrentOperation = () =>
                pendingSecretOperation.current === operation &&
                navigation.isFocused();
              const cancelOperation = () => {
                if (isCurrentOperation()) {
                  cancel();
                }
              };
              await sleep(500);
              if (!isCurrentOperation()) {
                return;
              }
              try {
                await dispatch(verifyIdentity());
              } catch {
                dispatch(
                  Analytics.track('Failed Backup Authentication', {context}),
                );
                cancelOperation();
                return;
              }
              dispatch(
                Analytics.track('Passed Backup Authentication', {context}),
              );
              if (!isCurrentOperation()) {
                return;
              }
              withDecryptedKey(({mnemonic, xPrivKey}) => {
                if (!isCurrentOperation()) {
                  return;
                }
                pendingSecretOperation.current = undefined;
                dispatch(
                  Analytics.track(
                    secret === 'phrase'
                      ? 'Viewed Recovery Phrase'
                      : 'Viewed Private Key',
                    {context},
                  ),
                );
                if (secret === 'phrase') {
                  openRecoveryPhrase(
                    mnemonic.trim().split(/[\u3000\s]+/),
                    'view',
                  );
                } else {
                  openRecoveryPhrase([], 'privateKey', xPrivKey);
                }
              }, cancelOperation);
            },
            primary: true,
          },
          {text: t('Cancel'), action: cancel},
        ],
      }),
    );
  };

  useMount(() => {
    if (!canOpen || !hasAppLock) {
      return;
    }
    if (viewRecoveryPhrase) {
      viewSecret('phrase');
    } else {
      dispatch(verifyIdentity())
        .then(() => {
          dispatch(Analytics.track('Passed Backup Authentication', {context}));
          setIdentityVerified(true);
        })
        .catch(() => {
          dispatch(Analytics.track('Failed Backup Authentication', {context}));
          navigation.goBack();
        });
    }
  });

  if (!canOpen) {
    return null;
  }

  if (!hasAppLock) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <BaseText>
          {t('Set up an extra layer of security to keep your wallet secure.')}
        </BaseText>
        <Button
          onPress={() =>
            dispatch(
              AppActions.showPinModal({
                type: 'set',
                onClose: checked => {
                  if (checked) {
                    setIdentityVerified(true);
                    if (viewRecoveryPhrase) {
                      viewSecret('phrase');
                    }
                  }
                },
              }),
            )
          }>
          {t('Set a PIN')}
        </Button>
      </ScrollView>
    );
  }

  if (viewRecoveryPhrase || !identityVerified) {
    return null;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="backup-onbloarding-view">
      {hasMnemonic ? (
        <BaseText style={[styles.paragraph, {color: colors.textDescription}]}>
          {t(
            'If you lose this phone, your recovery phrase is the only way to get the funds in {{keyName}} back. BitPay can’t recover it for you.',
            {keyName: key.keyName},
          )}
        </BaseText>
      ) : null}
      <BaseText accessibilityRole="header" style={styles.sectionTitle}>
        {t('Back Up Methods')}
      </BaseText>
      {canBackUpToCloud ? (
        <BackupMethodCard
          testID="cloud-backup-button"
          icon={<CloudGlyph color={colors.iconButtonGlyph} />}
          title={t('{{cloudName}} Backup', {cloudName})}
          tag={cloudBackedUp ? t('Completed') : t('Recommended')}
          tagTone={cloudBackedUp ? 'on' : 'rec'}
          description={
            cloudBackedUp
              ? t('Last backed up {{date}}.', {
                  date: moment(key.cloudBackupTimestamp).format('ll'),
                })
              : t(
                  'Saves an encrypted copy to {{cloudName}}, locked with a password you create.',
                  {cloudName},
                )
          }
          action={
            cloudBackedUp ? (
              <>
                <BannerLink onPress={() => onCloudBackupPress('again')}>
                  {t('Back Up Again')}
                </BannerLink>
                <BannerLink onPress={() => onCloudBackupPress('change')}>
                  {t('Change Backup Password')}
                </BannerLink>
              </>
            ) : null
          }
          onPress={
            cloudBackedUp ? undefined : () => onCloudBackupPress('create')
          }
        />
      ) : null}
      {hasMnemonic ? (
        <BackupMethodCard
          testID="write-down-backup-button"
          icon={<PenGlyph color={colors.iconButtonGlyph} />}
          title={t('Manual Backup')}
          tag={manualBackedUp ? t('Completed') : null}
          tagTone="on"
          description={t(
            'Write down your recovery phrase and keep it somewhere safe and offline.',
          )}
          action={
            manualBackedUp ? (
              <BannerLink onPress={onManualBackupPress}>
                {t('Write It Down Again')}
              </BannerLink>
            ) : null
          }
          onPress={manualBackedUp ? undefined : onManualBackupPress}
        />
      ) : null}
      <AdvancedMethods
        title={t('Advanced Methods')}
        open={advancedOpen}
        onToggle={() => setAdvancedOpen(open => !open)}
        items={[
          ...(hasMnemonic
            ? [
                {
                  label: t('View Recovery Phrase'),
                  onPress: () => viewSecret('phrase'),
                },
              ]
            : []),
          ...(hasPrivateKey
            ? [
                {
                  label: t('View Private Key'),
                  onPress: () => viewSecret('privateKey'),
                },
              ]
            : []),
        ]}
      />
      <View style={styles.banner}>
        <Banner
          type={'info'}
          description={t(
            'Encrypted on this phone. BitPay never sees your recovery phrase or backup password.',
          )}
        />
      </View>
    </ScrollView>
  );
};

export default BackupOnboarding;
