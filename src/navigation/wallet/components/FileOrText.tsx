import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ScreenGutter} from '../../../components/styled/Containers';
import Button, {ButtonState} from '../../../components/button/Button';
import BoxInput, {INPUT_HEIGHT} from '../../../components/form/BoxInput';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../contexts';
import {yupResolver} from '@hookform/resolvers/yup';
import yup from '../../../lib/yup';
import {useForm, Controller} from 'react-hook-form';
import {Key, KeyOptions} from '../../../store/wallet/wallet.models';
import {BaseText} from '../../../components/styled/Text';
import {
  Caution,
  LightBlue,
  White,
  SlateDark,
  Midnight,
  LinkBlue,
  Action,
  Black,
  LightBlack,
  LuckySevens,
  NeutralSlate,
  ProgressBlue,
  Slate,
} from '../../../styles/colors';
import {BwcProvider} from '../../../lib/bwc';
import {useLogger} from '../../../utils/hooks/useLogger';
import {useScreenRenderPerformance} from '../../../utils/hooks/useScreenRenderPerformance';
import {CommonActions, useNavigation, useRoute} from '@react-navigation/native';
import {
  startGetRates,
  startImportFile,
  startImportTSSFile,
} from '../../../store/wallet/effects';
import {
  setHomeCarouselConfig,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../tabs/TabsStack';
import {backupRedirect} from '../screens/Backup';
import {IsVMChain} from '../../../store/wallet/utils/currency';
import {RootState} from '../../../store';
import {fixWalletAddresses, sleep} from '../../../utils/helper-methods';
import {startUpdateAllWalletStatusForKey} from '../../../store/wallet/effects/status/status';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {populateImportedKeyPortfolio} from '../../../store/portfolio';
import {useTranslation} from 'react-i18next';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {ScrollView, Keyboard, AppState} from 'react-native';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {useOngoingProcess} from '../../../contexts';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import {logManager} from '../../../managers/LogManager';
import {
  TouchableOpacity,
  TouchableOpacityProps,
} from '@components/base/TouchableOpacity';
import UploadSvg from '../../../../assets/img/upload.svg';
import UploadDarkSvg from '../../../../assets/img/upload-dark.svg';
import CancelSvg from '../../../../assets/img/cancel.svg';
import CancelDarkSvg from '../../../../assets/img/cancel-dark.svg';
import Clipboard from '@react-native-clipboard/clipboard';
import {classifyBackupFile} from '../../../utils/cloud-backup/codec';
import {useBackupPasswordLockout, useCloudBackupRestore} from './CloudRestore';
import {PassphraseOptions} from '../../../components/backup/PassphraseOptions';

const BWCProvider = BwcProvider.getInstance();
const Encryption = BWCProvider.getEncryption();

const styles = StyleSheet.create({
  scrollViewContainer: {
    marginTop: 20,
  },
  contentView: {
    paddingHorizontal: parseInt(ScreenGutter, 10),
  },
  errorText: {
    color: Caution,
    fontSize: 12,
    fontWeight: '500',
    paddingTop: 5,
  },
  formRow: {
    marginBottom: 24,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  fileInputLabel: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.75,
    marginBottom: 6,
  },
  fileInputContainer: {
    borderWidth: 0.75,
    padding: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    height: INPUT_HEIGHT,
    borderRadius: 4,
  },
  fileInputText: {
    flex: 1,
    padding: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  fileChipContainer: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  fileChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  fileInputPlaceholder: {
    flex: 1,
    padding: 10,
    fontSize: 14,
    fontWeight: '500',
    color: Slate,
  },
  pasteContainer: {
    display: 'flex',
    paddingVertical: 4,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderRadius: 100,
  },
  pasteContainerText: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  iconButton: {
    width: INPUT_HEIGHT,
    height: INPUT_HEIGHT,
    borderRadius: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    width: INPUT_HEIGHT,
    height: INPUT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

interface FileContainerProps {
  isFocused: boolean;
  isError?: boolean;
  disabled?: boolean;
}

const FileInputContainer: React.FC<
  FileContainerProps & {children?: React.ReactNode}
> = ({isFocused, isError, disabled, children}) => {
  const theme = useTheme();

  let borderColor = theme.dark ? LuckySevens : Slate;
  let backgroundColor = theme.dark ? Black : White;
  let borderBottomColor = borderColor;

  if (isFocused) {
    backgroundColor = theme.dark ? 'transparent' : '#fafbff';
    borderColor = theme.dark ? LuckySevens : Slate;
    borderBottomColor = ProgressBlue;
  }

  if (isError) {
    backgroundColor = theme.dark ? '#090304' : '#EF476F0A';
    borderColor = '#fbc7d1';
    borderBottomColor = Caution;
  }

  if (disabled) {
    borderColor = theme.dark ? LightBlack : NeutralSlate;
    backgroundColor = theme.dark ? LightBlack : NeutralSlate;
    borderBottomColor = borderColor;
  }

  return (
    <View
      style={[
        styles.fileInputContainer,
        {borderColor, backgroundColor, borderBottomColor},
      ]}>
      {children}
    </View>
  );
};

const PasteContainer: React.FC<TouchableOpacityProps> = ({style, ...props}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.pasteContainer,
        {backgroundColor: theme.dark ? Midnight : LightBlue},
        style,
      ]}
      {...props}
    />
  );
};

const IconButton: React.FC<TouchableOpacityProps> = ({style, ...props}) => (
  <TouchableOpacity style={[styles.iconButton, style]} {...props} />
);

const ClearButton: React.FC<TouchableOpacityProps> = ({style, ...props}) => (
  <TouchableOpacity style={[styles.clearButton, style]} {...props} />
);

interface FileOrTextFieldValues {
  text: string;
  password: string;
}

const FileOrText = () => {
  const onPerformanceLayout = useScreenRenderPerformance('Import.FileOrText');
  const {t} = useTranslation();
  const logger = useLogger();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const route = useRoute<RouteProp<WalletGroupParamList, 'Import'>>();

  const walletTermsAccepted = useAppSelector(
    ({WALLET}: RootState) => WALLET.walletTermsAccepted,
  );

  const [importButtonState, setImportButtonState] = useState<ButtonState>();
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isFromClipboard, setIsFromClipboard] = useState(false);
  const [fileFocused, setFileFocused] = useState(false);
  const [isCloudBackup, setIsCloudBackup] = useState(false);
  const [passwordError, setPasswordError] = useState<string>();
  const [passphrase, setPassphrase] = useState('');

  useEffect(
    () => navigation.addListener('blur', () => setPassphrase('')),
    [navigation],
  );
  const {locked: cloudLocked, lockMessage: cloudLockMessage} =
    useBackupPasswordLockout();
  const locked = isCloudBackup && cloudLocked;
  const lockMessage = isCloudBackup ? cloudLockMessage : undefined;
  const usePhrase = () => navigation.navigate(t('Phrase') as never);
  const {restoreBackup} = useCloudBackupRestore({
    context: route.params?.context,
    onUsePhrase: usePhrase,
  });

  const schema = useMemo(
    () =>
      yup.object().shape({
        text: yup.string().required(t('Required')),
        password: yup.string().required(t('Required')),
      }),
    [t],
  );

  const {
    control,
    handleSubmit,
    setValue,
    clearErrors,
    formState: {errors},
  } = useForm<FileOrTextFieldValues>({resolver: yupResolver(schema)});

  const handleClearFile = useCallback(() => {
    setUploadedFileName('');
    setIsFromClipboard(false);
    setIsCloudBackup(false);
    setPassphrase('');
    setValue('text', '');
  }, [setValue]);

  const showInvalidFile = (reason: 'not_bitpay' | 'damaged') => {
    dispatch(Analytics.track('Cloud Restore Failed', {source: 'file', reason}));
    dispatch(
      showBottomNotificationModal({
        type: 'error',
        title:
          reason === 'not_bitpay'
            ? t('Not a BitPay backup file')
            : t('This file is damaged'),
        message:
          reason === 'not_bitpay'
            ? t(
                'Choose the file you saved from BitPay, or use your 12-word recovery phrase.',
              )
            : t(
                'We can’t read it. Try another copy, or use your 12-word recovery phrase.',
              ),
        enableBackdropDismiss: true,
        actions: [
          {text: t('Use 12-Word Phrase'), action: usePhrase, primary: true},
          {text: t('Try Another File'), action: () => {}},
        ],
      }),
    );
  };

  const loadBackupText = (
    raw: string,
    name: string,
    fromClipboard: boolean,
  ) => {
    const backupFile = classifyBackupFile(raw);
    if (backupFile.type === 'invalid') {
      showInvalidFile(backupFile.reason);
      return;
    }
    setValue('text', backupFile.text);
    clearErrors('text');
    setIsCloudBackup(backupFile.type === 'cloud');
    setUploadedFileName(name);
    setIsFromClipboard(fromClipboard);
  };

  const clearSensitive = useCallback(() => {
    handleClearFile();
    setValue('password', '');
  }, [handleClearFile, setValue]);

  const importWallet = async (
    decryptBackupText: string,
    opts: Partial<KeyOptions>,
  ) => {
    try {
      setImportButtonState('loading');
      showOngoingProcess('IMPORTING');
      await sleep(1000);
      // @ts-ignore
      const key = await dispatch<Key>(startImportFile(decryptBackupText, opts));
      try {
        showOngoingProcess('IMPORT_SCANNING_FUNDS');
        await dispatch(startGetRates({force: true}));
        // workaround for fixing wallets without receive address
        await fixWalletAddresses({
          appDispatch: dispatch,
          wallets: key.wallets,
        });
        await dispatch(
          startUpdateAllWalletStatusForKey({
            key,
            force: true,
            createTokenWalletWithFunds: true,
          }),
        );
        await sleep(1000);
        await dispatch(updatePortfolioBalance());
        populateImportedKeyPortfolio({dispatch, key, logger});
      } catch {
        // ignore error
      }

      dispatch(setHomeCarouselConfig({id: key.id, show: true}));

      setImportButtonState('success');
      await sleep(500);
      setImportButtonState(undefined);
      hideOngoingProcess();

      backupRedirect({
        context: route.params?.context,
        navigation,
        walletTermsAccepted,
        key,
      });

      dispatch(
        Analytics.track('Imported Key', {
          context: route.params?.context || '',
          source: 'FileOrText',
        }),
      );
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logger.error(errMsg);
      setImportButtonState('failed');
      await sleep(500);
      setImportButtonState(undefined);
      hideOngoingProcess();
      await sleep(1000);
      showErrorModal(errMsg);
    }
  };

  const showErrorModal = (e: string) => {
    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: t('Something went wrong'),
        message: e,
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('OK'),
            action: () => {},
            primary: true,
          },
        ],
      }),
    );
  };

  const rejectPassword = () =>
    setPasswordError(t('Incorrect password, try again'));

  const onSubmit = handleSubmit(async formData => {
    if (locked) {
      return;
    }
    const {text, password} = formData;
    setValue('password', '');
    Keyboard.dismiss();

    if (isCloudBackup) {
      const outcome = await restoreBackup(
        {source: 'file', text},
        password,
        passphrase,
      );
      if (outcome === 'wrong_password') {
        rejectPassword();
      } else if (outcome === 'unlocked') {
        handleClearFile();
      }
      return;
    }

    let opts: Partial<KeyOptions> = {};
    if (route.params?.keyId) {
      opts.keyId = route.params.keyId;
    }

    let decryptBackupText: string;
    try {
      decryptBackupText = Encryption.decryptWithPassword(
        text,
        password,
      ).toString();
    } catch (e: any) {
      logger.error(`Import: could not decrypt file ${e.message}`);
      rejectPassword();
      return;
    }

    try {
      const parsed = JSON.parse(decryptBackupText);
      if (parsed.isTSS) {
        importTSSWallet(decryptBackupText, opts);
        return;
      }
    } catch {}

    importWallet(decryptBackupText, opts);
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'inactive' || state === 'background') {
        clearSensitive();
      }
    });
    return () => sub.remove();
  }, [clearSensitive]);

  const importTSSWallet = async (
    decryptBackupText: string,
    opts: Partial<KeyOptions>,
  ) => {
    try {
      showOngoingProcess('IMPORTING');
      await sleep(1000);

      const key = (await dispatch<any>(
        startImportTSSFile(decryptBackupText, {
          keyId: opts.keyId,
        }),
      )) as Key;

      try {
        showOngoingProcess('IMPORT_SCANNING_FUNDS');
        await dispatch(startGetRates({force: true}));
        await fixWalletAddresses({
          appDispatch: dispatch,
          wallets: key.wallets,
        });
        await dispatch(
          startUpdateAllWalletStatusForKey({
            key,
            force: true,
            createTokenWalletWithFunds: true,
          }),
        );
        await sleep(1000);
        await dispatch(updatePortfolioBalance());
        populateImportedKeyPortfolio({dispatch, key, logger});
      } catch {}

      dispatch(setHomeCarouselConfig({id: key.id, show: true}));

      dispatch(
        Analytics.track('Imported Key', {
          context: route.params?.context || '',
          source: 'TSSFile',
        }),
      );
      if (route.params?.context === 'onboarding') {
        hideOngoingProcess();
        navigation.navigate('Pin');
        return;
      }

      const firstWallet = key.wallets[0];
      const baseRoutes = [
        {
          name: RootStacks.TABS,
          params: {screen: TabsScreens.HOME},
        },
      ];
      const accountDetailsRoute = {
        name: WalletScreens.ACCOUNT_DETAILS,
        params: {
          keyId: key.id,
          selectedAccountAddress: firstWallet?.receiveAddress,
        },
      };
      const walletDetailsRoute = {
        name: WalletScreens.WALLET_DETAILS,
        params: {
          walletId: firstWallet?.id,
        },
      };
      const routes = IsVMChain(firstWallet?.chain)
        ? [...baseRoutes, accountDetailsRoute]
        : [...baseRoutes, walletDetailsRoute];
      navigation.dispatch(
        CommonActions.reset({
          index: routes.length - 1,
          routes,
        }),
      );

      hideOngoingProcess();
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logger.error(errMsg);
      hideOngoingProcess();
      await sleep(1000);
      showErrorModal(errMsg);
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.plainText, DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });

      if (result.fileCopyUri) {
        const path = decodeURIComponent(result.fileCopyUri);
        const fileContent = await RNFS.readFile(path, 'utf8');
        RNFS.unlink(path).catch(() => {});
        loadBackupText(fileContent, result.name || 'file uploaded', false);
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        logManager.debug('[FileOrText] User cancelled file picker');
      } else {
        logManager.error('[FileOrText] Error picking file');
        showErrorModal(t('Failed to load file. Please try again.'));
      }
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getString();

      if (!clipboardContent) {
        showErrorModal(t('Clipboard is empty'));
        return;
      }

      loadBackupText(clipboardContent, t('Clipboard'), true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      logManager.error(`[FileOrText] Error pasting clipboard: ${errorMsg}`);
      showErrorModal(t('Failed to paste from clipboard'));
    }
  };

  const fileError = errors.text?.message;

  return (
    <KeyboardAwareScrollView
      testID="file-or-text-view"
      onLayout={onPerformanceLayout}
      style={styles.scrollViewContainer}
      extraScrollHeight={90}
      keyboardShouldPersistTaps={'handled'}>
      <ScrollView
        style={styles.contentView}
        keyboardShouldPersistTaps={'handled'}>
        <BaseText
          style={[
            styles.descriptionText,
            {color: theme.dark ? '#999' : SlateDark},
          ]}>
          {t(
            'Upload or paste in the file that was generated when you backed up your key. Exported wallet files and keyshare files are supported.',
          )}
        </BaseText>

        <View style={styles.formRow}>
          <BaseText
            style={[
              styles.fileInputLabel,
              {color: theme.dark ? White : '#1b1b1b'},
            ]}>
            {t('FILE')}
          </BaseText>

          <FileInputContainer isFocused={fileFocused} isError={!!fileError}>
            {uploadedFileName ? (
              isFromClipboard ? (
                <View style={styles.fileChipContainer}>
                  <View
                    style={[
                      styles.fileChip,
                      {
                        borderColor: theme.dark ? LinkBlue : Action,
                        backgroundColor: theme.dark ? Midnight : LightBlue,
                      },
                    ]}>
                    <BaseText
                      style={[
                        styles.fileChipText,
                        {color: theme.dark ? LinkBlue : Action},
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail">
                      {uploadedFileName}
                    </BaseText>
                  </View>
                </View>
              ) : (
                <BaseText
                  style={[styles.fileInputText, {color: theme.colors.text}]}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {uploadedFileName}
                </BaseText>
              )
            ) : (
              <BaseText
                style={styles.fileInputPlaceholder}
                numberOfLines={1}
                ellipsizeMode="tail"
              />
            )}

            {uploadedFileName ? (
              <ClearButton
                onPress={handleClearFile}
                onPressIn={() => setFileFocused(true)}
                onPressOut={() => setFileFocused(false)}>
                {theme.dark ? <CancelDarkSvg /> : <CancelSvg />}
              </ClearButton>
            ) : (
              <>
                <PasteContainer
                  onPress={handlePasteClipboard}
                  onPressIn={() => setFileFocused(true)}
                  onPressOut={() => setFileFocused(false)}>
                  <BaseText
                    style={[
                      styles.pasteContainerText,
                      {color: theme.dark ? LinkBlue : Action},
                    ]}>
                    {t('Paste')}
                  </BaseText>
                </PasteContainer>

                <IconButton
                  onPress={handlePickFile}
                  onPressIn={() => setFileFocused(true)}
                  onPressOut={() => setFileFocused(false)}>
                  {theme.dark ? <UploadDarkSvg /> : <UploadSvg />}
                </IconButton>
              </>
            )}
          </FileInputContainer>

          {fileError ? (
            <BaseText style={styles.errorText}>{fileError}</BaseText>
          ) : null}
        </View>

        <View style={styles.formRow}>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                testID="password-box-input"
                accessibilityLabel={t('PASSWORD')}
                label={t('PASSWORD')}
                placeholder={'strongPassword123'}
                type={'password'}
                disabled={locked}
                onChangeText={(text: string) => {
                  setPasswordError(undefined);
                  onChange(text);
                }}
                onBlur={onBlur}
                value={value}
                error={lockMessage || passwordError || errors.password?.message}
              />
            )}
            name="password"
            defaultValue=""
          />
        </View>

        {isCloudBackup ? (
          <PassphraseOptions value={passphrase} onChange={setPassphrase} />
        ) : null}

        <Button
          testID="import-wallet-button"
          accessibilityLabel={t('Import Wallet')}
          buttonStyle={'primary'}
          state={importButtonState}
          disabled={locked}
          onPress={onSubmit}>
          {t('Import Wallet')}
        </Button>
      </ScrollView>
    </KeyboardAwareScrollView>
  );
};

export default FileOrText;
