import React, {useLayoutEffect, useMemo, useState} from 'react';
import {Platform, ScrollView, StyleSheet} from 'react-native';
import haptic from '../../../components/haptic-feedback/haptic';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import {useTranslation} from 'react-i18next';
import {
  useAppDispatch,
  useLogger,
  useAppSelector,
  useMount,
} from '../../../utils/hooks';
import {useNavigation, useRoute} from '@react-navigation/native';
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
import {Analytics} from '../../../store/analytics/analytics.effects';
import {useBackupColors} from '../../../components/backup/colors';
import {PenGlyph} from '../../../components/backup/glyphs';
import {
  AdvancedMethods,
  BackupMethodCard,
  BannerLink,
} from '../../../components/backup/BackupCards';

export type BackupOnboardingParamList = {
  keyId: string;
  context?: string;
};

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {gap: 14, paddingTop: 10, paddingHorizontal: 12, paddingBottom: 20},
  paragraph: {fontSize: 16, lineHeight: 25},
  sectionTitle: {fontSize: 18, lineHeight: 24, fontWeight: '700', marginTop: 6},
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
  const {keyId, context} = route.params;
  const key = useAppSelector(({WALLET}) => WALLET.keys[keyId]);
  const biometricLockActive = useAppSelector(
    ({APP}) => APP.biometricLockActive,
  );
  const pinLockActive = useAppSelector(({APP}) => APP.pinLockActive);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const hasMnemonic = !!(
    key.properties?.mnemonic || key.properties?.mnemonicEncrypted
  );
  const manualBackedUp = !!key.backupComplete;
  const hasPrivateKey = !!(
    key.properties?.xPrivKey || key.properties?.xPrivKeyEncrypted
  );

  const headerTitle = useMemo(() => {
    return () => <HeaderTitle>{t('Back Up Recovery Phrase')}</HeaderTitle>;
  }, [t]);

  useLayoutEffect(() => {
    navigation.setOptions({headerTitle});
  }, [navigation, headerTitle]);

  useMount(() => {
    dispatch(verifyIdentity()).catch(() => navigation.goBack());
  });

  const withDecryptedKey = (onDecrypted: (decrypted: DecryptedKey) => void) => {
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
            dispatch(showBottomNotificationModal(WrongPasswordError()));
          }
        },
        description: t('To continue please enter your encryption password.'),
        onCancelHandler: () => null,
      }),
    );
  };

  const onManualBackupPress = () => {
    haptic('impactLight');
    dispatch(Analytics.track('Clicked Write Down Backup'));
    withDecryptedKey(({mnemonic}) =>
      navigation.navigate('RecoveryPhrase', {
        keyId: key.id,
        words: mnemonic.trim().split(' '),
        walletTermsAccepted: true,
        context,
      }),
    );
  };

  const continueLabel = biometricLockActive
    ? Platform.OS === 'ios'
      ? t('Continue with Face ID')
      : t('Continue with Biometrics')
    : pinLockActive
    ? t('Continue with PIN')
    : t('Continue');

  const viewSecret = (secret: 'phrase' | 'privateKey') => {
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
        enableBackdropDismiss: true,
        actions: [
          {
            text: continueLabel,
            action: async () => {
              await sleep(500);
              try {
                await dispatch(verifyIdentity());
              } catch {
                return;
              }
              withDecryptedKey(({mnemonic, xPrivKey}) =>
                navigation.navigate('RecoveryPhrase', {
                  keyId: key.id,
                  words: secret === 'phrase' ? mnemonic.trim().split(' ') : [],
                  walletTermsAccepted: true,
                  context,
                  mode: secret === 'phrase' ? 'view' : 'privateKey',
                  xPrivKey: secret === 'privateKey' ? xPrivKey : undefined,
                }),
              );
            },
            primary: true,
          },
          {text: t('Cancel'), action: () => {}},
        ],
      }),
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="backup-onbloarding-view">
      <BaseText style={[styles.paragraph, {color: colors.textDescription}]}>
        {t(
          'If you lose this phone, your recovery phrase is the only way to get the funds in {{keyName}} back. BitPay can’t recover it for you.',
          {keyName: key.keyName},
        )}
      </BaseText>
      <BaseText accessibilityRole="header" style={styles.sectionTitle}>
        {t('Back Up Methods')}
      </BaseText>
      {hasMnemonic ? (
        <BackupMethodCard
          testID="write-down-backup-button"
          icon={<PenGlyph color={colors.iconButtonGlyph} />}
          title={t('Manual Backup')}
          tag={manualBackedUp ? t('Completed') : null}
          tagTone="on"
          description={t(
            'Write down your 12-word recovery phrase and keep it somewhere safe and offline.',
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
    </ScrollView>
  );
};

export default BackupOnboarding;
