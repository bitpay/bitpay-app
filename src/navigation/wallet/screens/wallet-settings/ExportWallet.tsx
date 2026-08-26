import React, {useLayoutEffect, useMemo, useState} from 'react';
import {HeaderTitle, Paragraph} from '../../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTheme} from '../../../../contexts';
import {
  ActiveOpacity,
  AdvancedOptions,
  AdvancedOptionsButton,
  AdvancedOptionsContainer,
  Column,
  ScreenGutter,
  AdvancedOptionsButtonText,
} from '../../../../components/styled/Containers';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {SlateDark, White} from '../../../../styles/colors';
import yup from '../../../../lib/yup';
import {Controller, useForm} from 'react-hook-form';
import BoxInput from '../../../../components/form/BoxInput';
import Button, {ButtonState} from '../../../../components/button/Button';
import {yupResolver} from '@hookform/resolvers/yup';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import Haptic from '../../../../components/haptic-feedback/haptic';
import ChevronUpSvg from '../../../../../assets/img/chevron-up.svg';
import ChevronDownSvg from '../../../../../assets/img/chevron-down.svg';
import Checkbox from '../../../../components/checkbox/Checkbox';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../../WalletGroup';
import {BwcProvider} from '../../../../lib/bwc';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  isAndroidStoragePermissionGranted,
  sleep,
} from '../../../../utils/helper-methods';
import {useTranslation} from 'react-i18next';
import Mailer from 'react-native-mail';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {IS_DESKTOP} from '../../../../constants';
import {ShareOptions} from 'react-native-share';
import {shareFile as shareFileUtil} from '../../../../utils/share';
import {Platform, SafeAreaView, StyleSheet, View} from 'react-native';
import RNFS from 'react-native-fs';
import {APP_NAME_UPPERCASE} from '../../../../constants/config';
import {logManager} from '../../../../managers/LogManager';
import {findWalletById} from '../../../../store/wallet/utils/wallet';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {RootState} from '../../../../store';
import {ContactRowProps} from '../../../../components/list/ContactRow';

const BWCProvider = BwcProvider.getInstance();
const Encryption = BWCProvider.getEncryption();

const gutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  exportWalletContainer: {
    flex: 1,
  },
  scrollView: {
    marginTop: 20,
    paddingHorizontal: gutter,
  },
  passwordFormContainer: {
    marginVertical: 15,
  },
  exportWalletParagraph: {
    marginBottom: 15,
  },
  passwordActionContainer: {
    marginTop: 20,
  },
  passwordInputContainer: {
    marginVertical: 15,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  ctaContainer: {
    alignSelf: 'stretch',
    flexDirection: 'column',
    marginTop: 20,
  },
  checkBoxContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
});

const ExportWalletContainer: React.FC<
  React.ComponentProps<typeof SafeAreaView>
> = ({style, ...rest}) => (
  <SafeAreaView style={[styles.exportWalletContainer, style]} {...rest} />
);

const ScrollView: React.FC<
  React.ComponentProps<typeof KeyboardAwareScrollView>
> = ({style, ...rest}) => (
  <KeyboardAwareScrollView style={[styles.scrollView, style]} {...rest} />
);

const PasswordFormContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.passwordFormContainer, style]} {...rest} />;

const ExportWalletParagraph: React.FC<
  React.ComponentProps<typeof Paragraph>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <Paragraph
      style={[
        styles.exportWalletParagraph,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const AdvancedOptionsText: React.FC<React.ComponentProps<typeof Paragraph>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return <Paragraph style={[{color: theme.colors.text}, style]} {...rest} />;
};

const PasswordActionContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.passwordActionContainer, style]} {...rest} />;

const PasswordInputContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.passwordInputContainer, style]} {...rest} />;

interface ExportWalletPasswordFieldValues {
  password: string;
  confirmPassword: string;
}

const RowContainer: React.FC<React.ComponentProps<typeof TouchableOpacity>> = ({
  style,
  ...rest
}) => <TouchableOpacity style={[styles.rowContainer, style]} {...rest} />;

const CtaContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.ctaContainer, style]} {...rest} />;

const CheckBoxContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.checkBoxContainer, style]} {...rest} />;

const ExportWallet = () => {
  const {t} = useTranslation();
  const {
    params: {keyId, walletId, copayerId, keyObj},
  } = useRoute<RouteProp<WalletGroupParamList, 'ExportWallet'>>();
  const wallet = useAppSelector(({WALLET}) =>
    findWalletById(WALLET.keys[keyId].wallets, walletId, copayerId),
  ) as Wallet;

  const {network} = wallet;

  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const [showOptions, setShowOptions] = useState(false);
  const [dontIncludePrivateKey, setDontIncludePrivateKey] = useState(false);
  const contactList = useAppSelector(
    ({CONTACT}: RootState) => CONTACT.list,
  ) as ContactRowProps[];
  const contacts = useMemo(
    () => contactList.filter(contact => contact.network === network),
    [contactList, network],
  );
  const [copyButtonState, setCopyButtonState] = useState<ButtonState>();
  const [sendButtonState, setSendButtonState] = useState<ButtonState>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Export Wallet')}</HeaderTitle>,
    });
  }, [navigation, t]);

  const schema = useMemo(
    () =>
      yup.object().shape({
        password: yup.string().required(),
        confirmPassword: yup
          .string()
          .required()
          .oneOf([yup.ref('password')], t('Passwords must match')),
      }),
    [t],
  );
  const resolver = useMemo(() => yupResolver(schema), [schema]);
  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<ExportWalletPasswordFieldValues>({
    resolver,
  });

  const walletExport = (password: string): string => {
    if (!password) {
      throw new Error('Password is required');
    }

    const opts = {
      noSign: dontIncludePrivateKey,
      addressBook: contacts,
      password,
    };

    let backup: any = {
      credentials: JSON.parse(wallet.toString()),
    };

    /**----------- Read only wallet ---------------*/
    if (backup.credentials.keyId && opts.noSign) {
      delete backup.credentials.keyId;
    }
    /**--------------------------*/

    if (wallet.keyId && !opts.noSign) {
      backup.key = keyObj;
    }

    if (opts.addressBook) {
      backup.addressBook = opts.addressBook;
    }

    backup = JSON.stringify(backup);

    const encryptedBackup = JSON.stringify(
      Encryption.encryptWithPassword(backup, password, {iter: 1000}),
    );
    if (!encryptedBackup) {
      throw new Error('Unable to encrypt wallet backup');
    }
    return encryptedBackup;
  };

  const onCopyToClipboard = async ({password}: {password: string}) => {
    setCopyButtonState('loading');
    try {
      const _copyWallet = walletExport(password);
      Clipboard.setString(_copyWallet);
      setCopyButtonState('success');
      await sleep(500);
      setCopyButtonState(undefined);
    } catch {
      setCopyButtonState('failed');
      await sleep(500);
      setCopyButtonState(undefined);
    }
  };

  const shareFile = async ({password}: {password: string}) => {
    try {
      if (Platform.OS === 'android' && Platform.Version < 30) {
        await isAndroidStoragePermissionGranted(dispatch);
      }

      const _sendWallet = walletExport(password);
      const {
        credentials: {walletName: cWalletName, walletId},
        walletName,
      } = wallet;
      let name = walletName || cWalletName || walletId;

      if (dontIncludePrivateKey) {
        name = name + ' ' + t('(No Private Key)');
      }

      const txt = t(
        'Here is the encrypted backup of the wallet : \n\n \n\nTo import this backup, copy all text between {...}, including the symbols {}',
        {name, sendWallet: _sendWallet},
      );

      const rootPath =
        Platform.OS === 'ios'
          ? RNFS.LibraryDirectoryPath
          : RNFS.TemporaryDirectoryPath;
      const txtFilename = `${APP_NAME_UPPERCASE}-${walletName}`;
      let filePath = `${rootPath}/${txtFilename}`;

      await RNFS.mkdir(filePath);

      filePath += '.txt';
      const opts: ShareOptions = {
        title: txtFilename,
        url: `file://${filePath}`,
        subject: `${walletName} Encrypted Backup`,
      };

      await RNFS.writeFile(filePath, txt, 'utf8');
      await dispatch(shareFileUtil(opts));
    } catch (err: any) {
      logManager.debug(`[shareFile]: ${err.message}`);
      if (err && err.message === 'User did not share') {
        return;
      } else {
        throw err;
      }
    }
  };

  const handleEmail = (subject: string, body: string) => {
    Mailer.mail(
      {
        subject,
        body,
        isHTML: false,
      },
      (error, event) => {
        if (error) {
          logManager.error('Error sending email: ' + error);
        }
        if (event) {
          logManager.debug('Email Backup: ' + event);
        }
      },
    );
  };

  const onSendByEmail = async ({password}: {password: string}) => {
    try {
      setSendButtonState('loading');
      const _sendWallet = walletExport(password);
      const {
        credentials: {walletName: cWalletName, walletId},
        walletName,
      } = wallet;
      let name = walletName || cWalletName || walletId;

      if (dontIncludePrivateKey) {
        name = name + ' ' + t('(No Private Key)');
      }

      // TODO: Update app name
      const subject = t('BitPay Wallet Backup: ') + name;
      const body = t(
        'Here is the encrypted backup of the wallet : \n\n \n\nTo import this backup, copy all text between {...}, including the symbols {}',
        {name, sendWallet: _sendWallet},
      );

      handleEmail(subject, body);

      setSendButtonState('success');
      await sleep(200);
      setSendButtonState(undefined);
    } catch (err) {
      const e = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.error('[onSendByEmail] ', e);
      setSendButtonState('failed');
      await sleep(500);
      setSendButtonState(undefined);
    }
  };

  return (
    <ExportWalletContainer>
      <ScrollView>
        <ExportWalletParagraph>
          {t('Export your asset by creating a password')}
        </ExportWalletParagraph>

        <PasswordFormContainer>
          <PasswordInputContainer>
            <Controller
              control={control}
              render={({field: {onChange, onBlur, value}}) => (
                <BoxInput
                  placeholder={'strongPassword123'}
                  label={t('EXPORT PASSWORD')}
                  type={'password'}
                  onBlur={onBlur}
                  onChangeText={(text: string) => onChange(text)}
                  error={errors.password?.message}
                  value={value}
                />
              )}
              name="password"
              defaultValue=""
            />
          </PasswordInputContainer>

          <PasswordInputContainer>
            <Controller
              control={control}
              render={({field: {onChange, onBlur, value}}) => (
                <BoxInput
                  placeholder={'strongPassword123'}
                  label={t('CONFIRM EXPORT PASSWORD')}
                  type={'password'}
                  onBlur={onBlur}
                  onChangeText={(text: string) => onChange(text)}
                  error={errors.confirmPassword?.message}
                  value={value}
                />
              )}
              name="confirmPassword"
              defaultValue=""
            />
          </PasswordInputContainer>

          <CtaContainer>
            <AdvancedOptionsContainer>
              <AdvancedOptionsButton
                activeOpacity={ActiveOpacity}
                onPress={() => {
                  Haptic('impactLight');
                  setShowOptions(!showOptions);
                }}>
                {showOptions ? (
                  <>
                    <AdvancedOptionsButtonText>
                      {t('Hide Advanced Options')}
                    </AdvancedOptionsButtonText>
                    <ChevronUpSvg />
                  </>
                ) : (
                  <>
                    <AdvancedOptionsButtonText>
                      {t('Show Advanced Options')}
                    </AdvancedOptionsButtonText>
                    <ChevronDownSvg />
                  </>
                )}
              </AdvancedOptionsButton>

              {showOptions && (
                <AdvancedOptions>
                  <RowContainer
                    activeOpacity={1}
                    onPress={() => {
                      setDontIncludePrivateKey(!dontIncludePrivateKey);
                    }}>
                    <Column>
                      <AdvancedOptionsText>
                        {t('Do not include private key')}
                      </AdvancedOptionsText>
                    </Column>
                    <CheckBoxContainer>
                      <Checkbox
                        checked={dontIncludePrivateKey}
                        onPress={() => {
                          setDontIncludePrivateKey(!dontIncludePrivateKey);
                        }}
                      />
                    </CheckBoxContainer>
                  </RowContainer>
                </AdvancedOptions>
              )}
            </AdvancedOptionsContainer>
          </CtaContainer>

          <PasswordActionContainer>
            <Button
              onPress={handleSubmit(onCopyToClipboard)}
              state={copyButtonState}>
              {t('Copy to Clipboard')}
            </Button>
          </PasswordActionContainer>

          <PasswordActionContainer>
            <Button onPress={handleSubmit(shareFile)}>{t('Share File')}</Button>
          </PasswordActionContainer>

          {!IS_DESKTOP && (
            <PasswordActionContainer>
              <Button
                onPress={handleSubmit(onSendByEmail)}
                state={sendButtonState}
                buttonStyle={'secondary'}>
                {t('Send by Email')}
              </Button>
            </PasswordActionContainer>
          )}
        </PasswordFormContainer>
      </ScrollView>
    </ExportWalletContainer>
  );
};

export default ExportWallet;
