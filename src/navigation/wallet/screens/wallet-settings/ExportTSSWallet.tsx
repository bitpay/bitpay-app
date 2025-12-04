import React, {useLayoutEffect, useState} from 'react';
import {
  HeaderTitle,
  Paragraph,
  BaseText,
  H2,
} from '../../../../components/styled/Text';
import {useNavigation, useRoute, CommonActions} from '@react-navigation/native';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../../components/styled/Containers';
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
import {Platform, Modal} from 'react-native';
import Share, {ShareOptions} from 'react-native-share';
import RNFS from 'react-native-fs';
import {APP_NAME_UPPERCASE} from '../../../../constants/config';
import {logManager} from '../../../../managers/LogManager';
import {RootStacks} from '../../../../Root';
import {TabsScreens} from '../../../tabs/TabsStack';
import WalletCreatedSvg from '../../../../../assets/img/shared-success.svg';

const BWC = BwcProvider.getInstance();

const ExportContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled(KeyboardAwareScrollView)`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const PasswordFormContainer = styled.View`
  margin: 15px 0;
`;

const ExportParagraph = styled(Paragraph)`
  margin-bottom: 15px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const PasswordActionContainer = styled.View`
  margin-top: 20px;
`;

const PasswordInputContainer = styled.View`
  margin: 15px 0;
`;

const BottomButtonContainer = styled.View`
  padding: 16px ${ScreenGutter};
  padding-bottom: 32px;
`;

const ModalWrapper = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const ModalContainer = styled.SafeAreaView`
  flex: 1;
`;

const ModalHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 16px ${ScreenGutter};
`;

const ModalTitle = styled(BaseText)`
  font-size: 20px;
  font-weight: 700;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  text-align: center;
`;

const ModalContent = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 0 ${ScreenGutter};
`;

const SuccessImageContainer = styled.View`
  margin-bottom: 32px;
`;

const SuccessTitle = styled(H2)`
  margin-bottom: 16px;
  text-align: center;
`;

const SuccessDescription = styled(Paragraph)`
  text-align: center;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const ModalButtonContainer = styled.View`
  width: 100%;
  padding: 16px ${ScreenGutter} 32px;
`;

interface ExportPasswordFieldValues {
  password: string;
  confirmPassword: string;
}

export type ExportTSSWalletParamList = {
  keyId: string;
  context: 'createNewTSSKey' | 'joinTSSKey' | 'backupExistingTSSKey';
};

const ExportTSSWallet = () => {
  const {t} = useTranslation();
  const {
    params: {keyId, context},
  } = useRoute<RouteProp<WalletGroupParamList, 'ExportTSSWallet'>>();

  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const key = useAppSelector(({WALLET}) => (keyId ? WALLET.keys[keyId] : null));

  const [shareButtonState, setShareButtonState] = useState<ButtonState>();
  const [backupCompleted, setBackupCompleted] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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

    const bufferToArray = (
      value: Buffer | {data: number[]} | undefined,
    ): number[] | null => {
      if (!value) return null;
      if (Buffer.isBuffer(value)) {
        return Array.from(value);
      }
      if ('data' in value) {
        return value.data;
      }
      return null;
    };

    const keychain = key.properties?.keychain;

    const backup = {
      isTSS: true,
      version: 1,
      mnemonic: key.properties?.mnemonic,
      keychain: keychain
        ? {
            commonKeyChain: keychain.commonKeyChain,
            privateKeyShare: bufferToArray(keychain.privateKeyShare),
            reducedPrivateKeyShare: bufferToArray(
              keychain.reducedPrivateKeyShare,
            ),
          }
        : undefined,
      keyId: key.id,
      keyName: key.keyName,
      createdOn: Date.now(),
    };

    return BWC.getSJCL().encrypt(password, JSON.stringify(backup), {
      iter: 10000,
    });
  };

  const shareKeyshareFile = async ({password}: {password: string}) => {
    try {
      setShareButtonState('loading');

      if (Platform.OS === 'android' && Platform.Version < 30) {
        await isAndroidStoragePermissionGranted(dispatch);
      }

      const encryptedKeyshare = keyshareExport(password);

      if (!encryptedKeyshare) {
        throw new Error('Failed to export keyshare');
      }

      const walletName = key?.wallets?.[0]?.walletName || 'SharedWallet';
      const filename = `${APP_NAME_UPPERCASE}-Keyshare-${walletName}`;

      const rootPath =
        Platform.OS === 'ios'
          ? RNFS.LibraryDirectoryPath
          : RNFS.TemporaryDirectoryPath;

      let filePath = `${rootPath}/${filename}`;
      await RNFS.mkdir(filePath);
      filePath += '.txt';

      const txt = t(
        'Here is the encrypted keyshare backup for wallet: {{name}}\n\n{{keyshare}}\n\nTo import this backup, copy all text between {...}, including the symbols {}',
        {name: walletName, keyshare: encryptedKeyshare},
      );

      const opts: ShareOptions = {
        title: filename,
        url: `file://${filePath}`,
        subject: `${walletName} Keyshare Backup`,
      };

      await RNFS.writeFile(filePath, txt, 'utf8');
      await Share.open(opts);

      setShareButtonState('success');
      await sleep(500);
      setShareButtonState(undefined);

      setBackupCompleted(true);
    } catch (err: any) {
      logManager.debug(`[shareKeyshareFile]: ${err.message}`);
      if (err && err.message === 'User did not share') {
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
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          {name: RootStacks.TABS, params: {screen: TabsScreens.HOME}},
          {name: WalletScreens.KEY_OVERVIEW, params: {id: keyId}},
        ],
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

          <PasswordActionContainer>
            <Button
              onPress={handleSubmit(shareKeyshareFile)}
              state={shareButtonState}
              buttonStyle={'primary'}>
              {t('Backup Shared Wallet')}
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
              <Button buttonStyle={'primary'} onPress={handleViewWallet}>
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
