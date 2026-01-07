import React, {useEffect, useRef, useState} from 'react';
import {ScreenGutter} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import BoxInput, {INPUT_HEIGHT} from '../../../components/form/BoxInput';
import styled, {css} from 'styled-components/native';
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
import {useNavigation, useRoute} from '@react-navigation/native';
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
import {WalletGroupParamList} from '../WalletGroup';
import {backupRedirect} from '../screens/Backup';
import {RootState} from '../../../store';
import {fixWalletAddresses, sleep} from '../../../utils/helper-methods';
import {startUpdateAllWalletStatusForKey} from '../../../store/wallet/effects/status/status';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
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
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import UploadSvg from '../../../../assets/img/upload.svg';
import UploadDarkSvg from '../../../../assets/img/upload-dark.svg';
import CancelSvg from '../../../../assets/img/cancel.svg';
import CancelDarkSvg from '../../../../assets/img/cancel-dark.svg';
import {useTheme} from 'styled-components';
import Clipboard from '@react-native-clipboard/clipboard';

const BWCProvider = BwcProvider.getInstance();

const ScrollViewContainer = styled(KeyboardAwareScrollView)`
  margin-top: 20px;
`;

const ContentView = styled(ScrollView)`
  padding: 0 ${ScreenGutter};
`;

const ErrorText = styled(BaseText)`
  color: ${Caution};
  font-size: 12px;
  font-weight: 500;
  padding: 5px 0 0 0;
`;

const FormRow = styled.View`
  margin-bottom: 24px;
`;

const DescriptionText = styled(BaseText)`
  font-size: 14px;
  line-height: 20px;
  color: ${({theme}) => (theme.dark ? '#999' : SlateDark)};
  margin-bottom: 24px;
`;

interface FileContainerProps {
  isFocused: boolean;
  isError?: boolean;
  disabled?: boolean;
}

const FileInputLabel = styled(BaseText)`
  color: ${({theme}) => (theme.dark ? White : '#1b1b1b')};
  font-size: 13px;
  font-weight: 500;
  opacity: 0.75;
  margin-bottom: 6px;
`;

const FileInputContainer = styled.View<FileContainerProps>`
  border: 0.75px solid ${({theme}) => (theme.dark ? LuckySevens : Slate)};
  padding: 1px;
  flex-direction: row;
  align-items: center;
  position: relative;
  height: ${INPUT_HEIGHT}px;
  background-color: ${({theme}) => (theme.dark ? Black : White)};
  border-radius: 4px;

  ${({isFocused, theme}) =>
    isFocused &&
    css`
      background: ${theme.dark ? 'transparent' : '#fafbff'};
      border-color: ${theme.dark ? LuckySevens : Slate};
      border-bottom-color: ${ProgressBlue};
    `}

  ${({isError, theme}) =>
    isError &&
    css`
      background: ${theme.dark ? '#090304' : '#EF476F0A'};
      border-color: #fbc7d1;
      border-bottom-color: ${Caution};
    `}

  ${({disabled, theme}) =>
    disabled &&
    css`
      border-color: ${theme.dark ? LightBlack : NeutralSlate};
      background: ${theme.dark ? LightBlack : NeutralSlate};
    `}
`;

const FileInputText = styled(BaseText)`
  flex: 1;
  padding: 10px;
  font-size: 14px;
  font-weight: 500;
  color: ${({theme}) => theme.colors.text};
`;

const FileInputPlaceholder = styled(BaseText)`
  flex: 1;
  padding: 10px;
  font-size: 14px;
  font-weight: 500;
  color: ${Slate};
`;

const PasteContainer = styled(TouchableOpacity)`
  display: flex;
  padding: 4px 8px;
  justify-content: center;
  align-items: center;
  gap: 10px;
  border-radius: 100px;
  background-color: ${({theme}) => (theme.dark ? Midnight : LightBlue)};
`;

const PasteContainerText = styled(BaseText)`
  color: ${({theme}) => (theme.dark ? LinkBlue : Action)};
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
`;

const IconButton = styled(TouchableOpacity)`
  width: ${INPUT_HEIGHT}px;
  height: ${INPUT_HEIGHT}px;
  border-radius: 0px;
  background-color: transparent;
  align-items: center;
  justify-content: center;
`;

const ClearButton = styled(TouchableOpacity)`
  width: ${INPUT_HEIGHT}px;
  height: ${INPUT_HEIGHT}px;
  align-items: center;
  justify-content: center;
`;

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

  const [uploadedFileName, setUploadedFileName] = useState<string>('');
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
      showOngoingProcess('IMPORTING');
      await sleep(1000);
      // @ts-ignore
      const key = await dispatch<Key>(startImportFile(decryptBackupText, opts));
      hideOngoingProcess();
      await sleep(1000);

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
      } catch (error) {
        // ignore error
      }

      dispatch(setHomeCarouselConfig({id: key.id, show: true}));

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

      hideOngoingProcess();
    } catch (e: any) {
      logger.error(e.message);
      hideOngoingProcess();
      await sleep(1000);
      showErrorModal(e.message);
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
      decryptBackupText = BWCProvider.getSJCL().decrypt(password, text);
    } catch (e: any) {
      logger.error(`Import: could not decrypt file ${e.message}`);
      showErrorModal(t('Could not decrypt file, check your password'));
      return;
    }

    try {
      const parsed = JSON.parse(decryptBackupText);
      if (parsed.isTSS) {
        importTSSWallet(decryptBackupText);
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

  const importTSSWallet = async (decryptBackupText: string) => {
    try {
      showOngoingProcess('IMPORTING');
      await sleep(1000);

      const key = (await dispatch<any>(
        startImportTSSFile(decryptBackupText),
      )) as Key;

      hideOngoingProcess();
      await sleep(1000);

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
      } catch (error) {}

      dispatch(setHomeCarouselConfig({id: key.id, show: true}));

      backupRedirect({
        context: route.params?.context,
        navigation,
        walletTermsAccepted,
        key,
      });

      dispatch(
        Analytics.track('Imported Key', {
          context: route.params?.context || '',
          source: 'TSSFile',
        }),
      );

      hideOngoingProcess();
    } catch (e: any) {
      logger.error(e.message);
      hideOngoingProcess();
      await sleep(1000);
      showErrorModal(e.message);
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.plainText, DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });

      if (result.fileCopyUri) {
        const fileContent = await RNFS.readFile(result.fileCopyUri, 'utf8');
        const encryptedMatch = fileContent.match(/\{[^}]+\}/);

        if (encryptedMatch) {
          const encryptedText = encryptedMatch[0];
          setValue('text', encryptedText);
          setUploadedFileName(result.name || 'file uploaded');
          logManager.debug(
            `[FileOrText] Successfully loaded file: ${result.name}`,
          );
        } else {
          setValue('text', fileContent.trim());
          setUploadedFileName(result.name || 'file uploaded');
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
        setUploadedFileName('pasted text');
        logManager.debug('[FileOrText] Pasted encrypted text from clipboard');
      } else {
        setValue('text', clipboardContent.trim());
        setUploadedFileName('pasted text');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      logManager.error(`[FileOrText] Error pasting clipboard: ${errorMsg}`);
      showErrorModal(t('Failed to paste from clipboard'));
    }
  };

  const handleClearFile = () => {
    setUploadedFileName('');
    setValue('text', '');
  };

  const fileError = errors.text?.message;

  return (
    <ScrollViewContainer
      accessibilityLabel="file-or-text-view"
      extraScrollHeight={90}
      keyboardShouldPersistTaps={'handled'}>
      <ContentView keyboardShouldPersistTaps={'handled'}>
        <DescriptionText>
          {t(
            'Upload or paste in the file that was generated when you backed up your key. Exported wallet files and keyshare files are supported.',
          )}
        </DescriptionText>

        <FormRow>
          <FileInputLabel>{t('FILE')}</FileInputLabel>

          <FileInputContainer isFocused={fileFocused} isError={!!fileError}>
            {uploadedFileName ? (
              <FileInputText numberOfLines={1} ellipsizeMode="tail">
                {uploadedFileName}
              </FileInputText>
            ) : (
              <FileInputPlaceholder numberOfLines={1} ellipsizeMode="tail" />
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
                  <PasteContainerText>{t('Paste')}</PasteContainerText>
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
            <ErrorText>
              {typeof fileError === 'string'
                ? fileError.charAt(0).toUpperCase() + fileError.slice(1)
                : String(fileError)}
            </ErrorText>
          ) : null}
        </FormRow>

        <FormRow>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                accessibilityLabel="password-box-input"
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
        </FormRow>

        <Button
          accessibilityLabel="import-wallet-button"
          buttonStyle={'primary'}
          onPress={onSubmit}>
          {t('Import Wallet')}
        </Button>
      </ContentView>
    </ScrollViewContainer>
  );
};

export default FileOrText;
