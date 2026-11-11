import React, {useLayoutEffect, useState} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useHeaderHeight} from '@react-navigation/elements';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import BoxInput from '../../../components/form/BoxInput';
import Button from '../../../components/button/Button';
import {useBackupColors} from '../../../components/backup/colors';
import {PassphraseOptions} from '../../../components/backup/PassphraseOptions';
import {
  CloudBackupFileEntry,
  CloudBackupKind,
} from '../../../utils/cloud-backup/storage';
import {
  useBackupPasswordLockout,
  useCloudBackupRestore,
} from '../components/CloudRestore';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';

export interface RestoreFromCloudPasswordParamList {
  context?: string;
  files: CloudBackupFileEntry[];
  kind?: CloudBackupKind;
}

type RestoreFromCloudPasswordProps = NativeStackScreenProps<
  WalletGroupParamList,
  WalletScreens.RESTORE_FROM_CLOUD_PASSWORD
>;

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {gap: 18, paddingTop: 10, paddingHorizontal: 12, paddingBottom: 20},
  paragraph: {fontSize: 16, lineHeight: 25},
  footer: {paddingHorizontal: 12, paddingTop: 12, gap: 4},
});

const RestoreFromCloudPassword = ({
  navigation,
  route,
}: RestoreFromCloudPasswordProps) => {
  const {t} = useTranslation();
  const colors = useBackupColors();
  const headerHeight = useHeaderHeight();
  const {context, files, kind} = route.params;
  const cloudName = Platform.OS === 'ios' ? 'iCloud' : 'Google Drive';
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string>();
  const [passphrase, setPassphrase] = useState('');
  const {locked, lockMessage} = useBackupPasswordLockout();
  const usePhrase = () =>
    navigation.replace('Import', {context, importTab: 'phrase'});
  const {restoreBackup} = useCloudBackupRestore({
    context,
    onUsePhrase: usePhrase,
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>{t('Enter Backup Password')}</HeaderTitle>
      ),
    });
  }, [navigation, t]);

  const restore = async () => {
    if (locked) {
      return;
    }
    if (!password) {
      setPasswordError(t('Required'));
      return;
    }
    Keyboard.dismiss();
    const outcome = await restoreBackup(
      {source: 'cloud', files, kind},
      password,
      passphrase,
    );
    if (outcome === 'wrong_password') {
      setPasswordError(t('Incorrect password, try again'));
      return;
    }
    if (outcome === 'unlocked') {
      setPassword('');
      setPassphrase('');
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={headerHeight}>
        <ScrollView
          testID="restore-from-cloud-password-view"
          keyboardShouldPersistTaps={'handled'}
          contentContainerStyle={styles.content}>
          <BaseText style={[styles.paragraph, {color: colors.textDescription}]}>
            {t(
              'Enter the password you created when you backed up to {{cloudName}}.',
              {cloudName},
            )}
          </BaseText>
          <BoxInput
            testID="restore-password-input"
            accessibilityLabel={t('PASSWORD')}
            label={t('PASSWORD')}
            type={'password'}
            textContentType={'password'}
            autoComplete={'password'}
            value={password}
            disabled={locked}
            onChangeText={(text: string) => {
              setPassword(text);
              setPasswordError(undefined);
            }}
            onSubmitEditing={restore}
            error={lockMessage || passwordError}
          />
          {kind === 'keyshare' ? null : (
            <PassphraseOptions value={passphrase} onChange={setPassphrase} />
          )}
        </ScrollView>
        <View style={styles.footer}>
          <Button
            testID="restore-key-button"
            disabled={locked}
            onPress={restore}>
            {t('Restore Key')}
          </Button>
          <Button buttonType={'link'} onPress={usePhrase}>
            {t('Forgot Password?')}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RestoreFromCloudPassword;
