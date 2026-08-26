import React, {useLayoutEffect, useState} from 'react';
import {
  HeaderTitle,
  Paragraph,
  BaseText,
  H3,
} from '../../../../components/styled/Text';
import {useNavigation, useRoute, CommonActions} from '@react-navigation/native';
import {useTheme} from '../../../../contexts';
import {
  ActiveOpacity,
  AdvancedOptions,
  AdvancedOptionsButton,
  AdvancedOptionsContainer,
  Column,
  AdvancedOptionsButtonText,
  ScreenGutter,
} from '../../../../components/styled/Containers';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {SlateDark, White, Black, Slate30} from '../../../../styles/colors';
import yup from '../../../../lib/yup';
import {Controller, useForm} from 'react-hook-form';
import BoxInput from '../../../../components/form/BoxInput';
import Button, {ButtonState} from '../../../../components/button/Button';
import {yupResolver} from '@hookform/resolvers/yup';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList, WalletScreens} from '../../WalletGroup';
import {BwcProvider} from '../../../../lib/bwc';
import {
  isAndroidStoragePermissionGranted,
  sleep,
} from '../../../../utils/helper-methods';
import {useTranslation} from 'react-i18next';
import {Platform, Modal, SafeAreaView, StyleSheet, View} from 'react-native';
import Haptic from '../../../../components/haptic-feedback/haptic';
import ChevronUpSvg from '../../../../../assets/img/chevron-up.svg';
import ChevronDownSvg from '../../../../../assets/img/chevron-down.svg';
import Checkbox from '../../../../components/checkbox/Checkbox';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {ShareOptions} from 'react-native-share';
import {shareFile} from '../../../../utils/share';
import RNFS from 'react-native-fs';
import {APP_NAME_UPPERCASE} from '../../../../constants/config';
import {logManager} from '../../../../managers/LogManager';
import {RootStacks} from '../../../../Root';
import {TabsScreens} from '../../../tabs/TabsStack';
import WalletCreatedSvg from '../../../../../assets/img/shared-success.svg';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {checkPrivateKeyEncrypted} from '../../../../store/wallet/utils/wallet';
import {IsVMChain} from '../../../../store/wallet/utils/currency';
import {WalletActions} from '../../../../store/wallet';

const BWC = BwcProvider.getInstance();
const TssKey = BWC.getTssKey();

const gutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  exportContainer: {
    flex: 1,
  },
  scrollView: {
    marginTop: 20,
    paddingHorizontal: gutter,
  },
  passwordFormContainer: {
    marginVertical: 15,
  },
  exportParagraph: {
    marginBottom: 15,
  },
  passwordActionContainer: {
    marginTop: 20,
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
  passwordInputContainer: {
    marginVertical: 15,
  },
  bottomButtonContainer: {
    paddingTop: 16,
    paddingHorizontal: gutter,
    paddingBottom: 32,
  },
  modalWrapper: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: gutter,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: gutter,
  },
  successImageContainer: {
    marginBottom: 32,
  },
  successTitle: {
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 47,
  },
  successDescription: {
    textAlign: 'center',
  },
  modalButtonContainer: {
    width: '100%',
    paddingTop: 16,
    paddingHorizontal: gutter,
    paddingBottom: 32,
  },
});

const ExportContainer: React.FC<React.ComponentProps<typeof SafeAreaView>> = ({
  style,
  ...rest
}) => <SafeAreaView style={[styles.exportContainer, style]} {...rest} />;

const ScrollView: React.FC<
  React.ComponentProps<typeof KeyboardAwareScrollView>
> = ({style, ...rest}) => (
  <KeyboardAwareScrollView style={[styles.scrollView, style]} {...rest} />
);

const PasswordFormContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.passwordFormContainer, style]} {...rest} />;

const ExportParagraph: React.FC<React.ComponentProps<typeof Paragraph>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <Paragraph
      style={[
        styles.exportParagraph,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const PasswordActionContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.passwordActionContainer, style]} {...rest} />;

const AdvancedOptionsText: React.FC<React.ComponentProps<typeof Paragraph>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return <Paragraph style={[{color: theme.colors.text}, style]} {...rest} />;
};

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

const PasswordInputContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.passwordInputContainer, style]} {...rest} />;

const BottomButtonContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.bottomButtonContainer, style]} {...rest} />;

const ModalWrapper: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.modalWrapper,
        {backgroundColor: theme.dark ? Black : White},
        style,
      ]}
      {...rest}
    />
  );
};

const ModalContainer: React.FC<React.ComponentProps<typeof SafeAreaView>> = ({
  style,
  ...rest
}) => <SafeAreaView style={[styles.modalContainer, style]} {...rest} />;

const ModalHeader: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.modalHeader, style]} {...rest} />;

const ModalTitle: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.modalTitle, {color: theme.dark ? White : Black}, style]}
      {...rest}
    />
  );
};

const ModalContent: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.modalContent, style]} {...rest} />;

const SuccessImageContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.successImageContainer, style]} {...rest} />;

const SuccessTitle: React.FC<React.ComponentProps<typeof H3>> = ({
  style,
  ...rest
}) => <H3 style={[styles.successTitle, style]} {...rest} />;

const SuccessDescription: React.FC<React.ComponentProps<typeof Paragraph>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <Paragraph
      style={[
        styles.successDescription,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const ModalButtonContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.modalButtonContainer, style]} {...rest} />;

interface ExportPasswordFieldValues {
  password: string;
  confirmPassword: string;
}

export type ExportTSSWalletParamList = {
  keyId: string;
  context: 'createNewTSSKey' | 'joinTSSKey' | 'backupExistingTSSKey';
  decryptPassword?: string;
};

const ExportTSSWallet = () => {
  const {t} = useTranslation();
  const {
    params: {keyId, context, decryptPassword},
  } = useRoute<RouteProp<WalletGroupParamList, 'ExportTSSWallet'>>();

  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const key = useAppSelector(({WALLET}) => (keyId ? WALLET.keys[keyId] : null));

  const [shareButtonState, setShareButtonState] = useState<ButtonState>();
  const [backupCompleted, setBackupCompleted] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [dontIncludePrivateKey, setDontIncludePrivateKey] = useState(false);

  const showContinueButton =
    context === 'createNewTSSKey' || context === 'joinTSSKey';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Backup Keyshare')}</HeaderTitle>,
    });
  }, [navigation, t]);

  const schema = yup.object().shape({
    password: yup.string().required(),
    confirmPassword: yup
      .string()
      .required()
      .oneOf([yup.ref('password')], t('Passwords must match')),
  });

  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<ExportPasswordFieldValues>({
    resolver: yupResolver(schema),
  });

  const keyshareExport = (password: string) => {
    if (!password || !key) {
      return null;
    }
    let keyData;
    if (!decryptPassword && checkPrivateKeyEncrypted(key)) {
      throw new Error('Key is encrypted, decryptPassword is required');
    } else if (decryptPassword && checkPrivateKeyEncrypted(key)) {
      const tempKey = new TssKey(key.methods.toObj());
      tempKey.decrypt(decryptPassword);
      keyData = tempKey.toObj();
    } else {
      keyData = key.methods.toObj();
    }
    const backup: {
      isTSS: boolean;
      version: number;
      key?: any;
      credentials: any[];
    } = {
      isTSS: true,
      version: 1,
      credentials: key.wallets.map((wallet: Wallet) => {
        const credObj = wallet.credentials.toObj();
        if (dontIncludePrivateKey) {
          delete credObj.keyId;
        }
        return credObj;
      }),
    };

    if (!dontIncludePrivateKey) {
      backup.key = keyData;
    }

    const encrypted = BWC.getEncryption().encryptWithPassword(
      JSON.stringify(backup),
      password,
      {iter: 1000},
    );

    return JSON.stringify(encrypted);
  };

  const shareKeyshareFile = async ({password}: {password: string}) => {
    let filePath: string | undefined;
    try {
      setShareButtonState('loading');
      await sleep(500);

      if (Platform.OS === 'android' && Platform.Version < 30) {
        await isAndroidStoragePermissionGranted(dispatch);
      }

      const encryptedKeyshare = keyshareExport(password);

      if (!encryptedKeyshare) {
        throw new Error('Failed to export keyshare');
      }

      const walletName = key?.wallets?.[0]?.walletName || 'SharedWallet';
      const displayName = dontIncludePrivateKey
        ? `${walletName} ${t('(No Private Key)')}`
        : walletName;
      const filename = `${APP_NAME_UPPERCASE}-Keyshare-${displayName}.txt`;

      const rootPath = RNFS.TemporaryDirectoryPath;

      filePath = `${rootPath}/${filename}`;

      const txt = t(
        'Here is the encrypted keyshare backup for wallet: {{name}}\n\n{{keyshare}}\n\nTo import this backup, copy all text between {...}, including the symbols {}',
        {name: displayName, keyshare: encryptedKeyshare},
      );

      await RNFS.writeFile(filePath, txt, 'utf8');

      const opts: ShareOptions = {
        title: filename,
        url: Platform.OS === 'android' ? `file://${filePath}` : filePath,
        subject: `${walletName} Keyshare Backup`,
        type: 'text/plain',
      };

      await dispatch(shareFile(opts));

      RNFS.unlink(filePath).catch(() => {});

      setShareButtonState('success');
      await sleep(500);
      setShareButtonState(undefined);

      setBackupCompleted(true);
      dispatch(WalletActions.setBackupComplete(keyId));
    } catch (err: any) {
      logManager.debug(`[shareKeyshareFile]: ${err.message}`);
      if (filePath) {
        RNFS.unlink(filePath).catch(() => {});
      }
      // On Android, react-native-share throws "User did not share" even when the user picks an
      // email app — Treat it as success on Android since the file was already handed off to the target app
      if (
        err &&
        err.message === 'User did not share' &&
        Platform.OS === 'android'
      ) {
        setShareButtonState('success');
        await sleep(500);
        setShareButtonState(undefined);
        setBackupCompleted(true);
        dispatch(WalletActions.setBackupComplete(keyId));
      } else if (err && err.message === 'User did not share') {
        setShareButtonState(undefined);
        return;
      } else {
        setShareButtonState('failed');
        await sleep(500);
        setShareButtonState(undefined);
      }
    }
  };

  const handleContinue = () => {
    setShowSuccessModal(true);
  };

  const handleViewWallet = () => {
    setShowSuccessModal(false);

    const baseRoutes = [
      {
        name: RootStacks.TABS,
        params: {screen: TabsScreens.HOME},
      },
    ];

    const AccountDetailsRoute = {
      name: WalletScreens.ACCOUNT_DETAILS,
      params: {
        keyId: key.id,
        selectedAccountAddress: key.wallets[0]?.receiveAddress,
      },
    };

    const walletDetailsRoute = {
      name: WalletScreens.WALLET_DETAILS,
      params: {
        walletId: key.wallets[0].id,
      },
    };

    const routes = !key.backupComplete
      ? [...baseRoutes]
      : IsVMChain(key.wallets[0].chain)
      ? [...baseRoutes, AccountDetailsRoute]
      : [...baseRoutes, walletDetailsRoute];

    navigation.dispatch(
      CommonActions.reset({
        index: routes.length - 1,
        routes,
      }),
    );
  };

  return (
    <ExportContainer>
      <ScrollView>
        <ExportParagraph>
          {t('Create a password to encrypt your keyshare backup file.')}
        </ExportParagraph>

        <PasswordFormContainer>
          <PasswordInputContainer>
            <Controller
              control={control}
              render={({field: {onChange, onBlur, value}}) => (
                <BoxInput
                  placeholder={'strongPassword123'}
                  label={t('BACKUP PASSWORD')}
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
                  label={t('CONFIRM BACKUP PASSWORD')}
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
              onPress={handleSubmit(shareKeyshareFile)}
              state={shareButtonState}
              buttonStyle={'primary'}>
              {t('Share Backup File')}
            </Button>
          </PasswordActionContainer>
        </PasswordFormContainer>
      </ScrollView>

      {showContinueButton && backupCompleted && (
        <BottomButtonContainer>
          <Button onPress={handleContinue} buttonStyle={'primary'}>
            {t('Continue')}
          </Button>
        </BottomButtonContainer>
      )}

      <Modal
        visible={showSuccessModal}
        animationType="slide"
        presentationStyle="fullScreen">
        <ModalWrapper>
          <ModalContainer>
            <ModalHeader>
              <ModalTitle>{t('Wallet Created')}</ModalTitle>
            </ModalHeader>

            <ModalContent>
              <SuccessImageContainer>
                <WalletCreatedSvg width={300} height={300} />
              </SuccessImageContainer>

              <SuccessTitle>{t('Success!')}</SuccessTitle>

              <SuccessDescription>
                {t(
                  'Your shared wallet has successfully been created. Go check it out!',
                )}
              </SuccessDescription>
            </ModalContent>

            <ModalButtonContainer>
              <Button
                buttonStyle={'primary'}
                onPress={handleViewWallet}
                touchableLibrary={'react-native'}>
                {t('View Shared Wallet')}
              </Button>
            </ModalButtonContainer>
          </ModalContainer>
        </ModalWrapper>
      </Modal>
    </ExportContainer>
  );
};

export default ExportTSSWallet;
