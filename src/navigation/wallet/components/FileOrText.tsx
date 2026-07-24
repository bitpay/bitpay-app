import React, {useEffect, useRef, useState} from 'react';
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
import {ScrollView, Keyboard, TextInput, AppState} from 'react-native';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {
  useAppDispatch,
  useAppSelector,
  useSensitiveRefClear,
} from '../../../utils/hooks';
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

const schema = yup.object().shape({
  text: yup.string().required(),
  password: yup.string().required(),
});

const FileOrText = () => {
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

  const plainTextRef = useRef<TextInput>(null);
  const {clearSensitive} = useSensitiveRefClear([plainTextRef]);

  const [importButtonState, setImportButtonState] = useState<ButtonState>();
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isFromClipboard, setIsFromClipboard] = useState(false);
  const [fileFocused, setFileFocused] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: {errors},
  } = useForm<FileOrTextFieldValues>({resolver: yupResolver(schema)});

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
      } catch (error) {
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

  const onSubmit = handleSubmit(formData => {
    const {text, password} = formData;
    clearSensitive();
    Keyboard.dismiss();

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
      showErrorModal(t('Could not decrypt file, check your password'));
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
      } catch (error) {}

      dispatch(setHomeCarouselConfig({id: key.id, show: true}));

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

      dispatch(
        Analytics.track('Imported Key', {
          context: route.params?.context || '',
          source: 'TSSFile',
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
        const fileContent = await RNFS.readFile(
          decodeURIComponent(result.fileCopyUri),
          'utf8',
        );
        const encryptedMatch = fileContent.match(/\{[^}]+\}/);

        if (encryptedMatch) {
          const encryptedText = encryptedMatch[0];
          setValue('text', encryptedText);
          setUploadedFileName(result.name || 'file uploaded');
          setIsFromClipboard(false);
          logManager.debug(
            `[FileOrText] Successfully loaded file: ${result.name}`,
          );
        } else {
          setValue('text', fileContent.trim());
          setUploadedFileName(result.name || 'file uploaded');
          setIsFromClipboard(false);
        }
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        logManager.debug('[FileOrText] User cancelled file picker');
      } else {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        logManager.error(`[FileOrText] Error picking file: ${errorMsg}`);
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

      const encryptedMatch = clipboardContent.match(/\{[^}]+\}/);

      if (encryptedMatch) {
        setValue('text', encryptedMatch[0]);
        setUploadedFileName(t('Clipboard'));
        setIsFromClipboard(true);
        logManager.debug('[FileOrText] Pasted encrypted text from clipboard');
      } else {
        setValue('text', clipboardContent.trim());
        setUploadedFileName(t('Clipboard'));
        setIsFromClipboard(true);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      logManager.error(`[FileOrText] Error pasting clipboard: ${errorMsg}`);
      showErrorModal(t('Failed to paste from clipboard'));
    }
  };

  const handleClearFile = () => {
    setUploadedFileName('');
    setIsFromClipboard(false);
    setValue('text', '');
  };

  const fileError = errors.text?.message;

  return (
    <KeyboardAwareScrollView
      testID="file-or-text-view"
      accessibilityLabel="File or text view"
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
            <BaseText style={styles.errorText}>
              {typeof fileError === 'string'
                ? fileError.charAt(0).toUpperCase() + fileError.slice(1)
                : String(fileError)}
            </BaseText>
          ) : null}
        </View>

        <View style={styles.formRow}>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                testID="password-box-input"
                accessibilityLabel="Password"
                label={t('PASSWORD')}
                placeholder={'strongPassword123'}
                type={'password'}
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.password?.message}
              />
            )}
            name="password"
            defaultValue=""
          />
        </View>

        <Button
          testID="import-wallet-button"
          accessibilityLabel="Import wallet"
          buttonStyle={'primary'}
          state={importButtonState}
          onPress={onSubmit}>
          {t('Import Wallet')}
        </Button>
      </ScrollView>
    </KeyboardAwareScrollView>
  );
};

export default FileOrText;
