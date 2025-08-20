import React, {useCallback} from 'react';
import RNFS from 'react-native-fs';
import {Platform, ScrollView} from 'react-native';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  ActionContainer,
  CtaContainerAbsolute,
  ImageContainer,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/Containers';
import {H3, Paragraph, TextAlign} from '../../../components/styled/Text';
import {useThemeType} from '../../../utils/hooks/useThemeType';
import {useTranslation} from 'react-i18next';
import {useAppDispatch, useLogger, useAppSelector} from '../../../utils/hooks';
import {OnboardingImage} from '../../../navigation/onboarding/components/Containers';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Key} from '../../../store/wallet/wallet.models';
import {getMnemonic, sleep} from '../../../utils/helper-methods';
import {AppActions} from '../../../store/app';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import Share, {ShareOptions} from 'react-native-share';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {CustomErrorMessage} from '../components/ErrorMessages';
import {checkBiometricForSending} from '../../../store/wallet/effects/send/send';
import {checkPrivateKeyEncrypted} from '../../../store/wallet/utils/wallet';

export type BackupOnboardingParamList = {
  key: Key;
  buildEncryptModalConfig: Function;
};

const BackupOnboardingContainer = styled.SafeAreaView`
  flex: 1;
  align-items: stretch;
`;

const KeyImage = {
  light: (
    <OnboardingImage
      style={{width: 217, height: 195}}
      source={require('../../../../assets/img/onboarding/light/backup.png')}
    />
  ),
  dark: (
    <OnboardingImage
      style={{width: 217, height: 165}}
      source={require('../../../../assets/img/onboarding/dark/backup.png')}
    />
  ),
};

const BackupOnboarding: React.FC = () => {
  const {t} = useTranslation();
  const themeType = useThemeType();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const logger = useLogger();
  const {biometricLockActive} = useAppSelector(({APP}) => APP);

  const route = useRoute<RouteProp<WalletGroupParamList, 'BackupOnboarding'>>();
  const {key, buildEncryptModalConfig} = route.params;

  const printBackupTemplate = async () => {
    logger.debug('Print backup template clicked.');

    let sourceStoragePath: string;
    if (Platform.OS === 'ios') {
      // IOS
      // The file must be placed from xcode in BitPayApp -> Resources (Right click -> "Add files to BitPayApp") as bitpay-recovery-phrase-template.pdf
      // to be accessed from MainBundlePath

      sourceStoragePath = RNFS.MainBundlePath;
    } else {
      // ANDROID
      // The file must be placed in android/app/src/main/assets/bitpay-recovery-phrase-template.pdf
      // To access the file on android, we must copy it to the cache directory first
      const s = 'bitpay-recovery-phrase-template.pdf'; // Ruta al PDF en tus activos
      const d = `${RNFS.CachesDirectoryPath}/bitpay-recovery-phrase-template.pdf`;

      try {
        await RNFS.copyFileAssets(s, d);
      } catch (err) {
        let errMsg = '';
        if (err instanceof Error) {
          errMsg = err.message;
        } else {
          errMsg = JSON.stringify(err);
        }

        logger.error(
          `Failed trying to execute RNFS.copyFileAssets. Error: ${errMsg}`,
        );
        await sleep(500);
        await showErrorMessage(
          CustomErrorMessage({
            errMsg: t('The file could not be shared'),
            title: t('Uh oh, something went wrong'),
          }),
        );
        return;
      }

      sourceStoragePath = RNFS.CachesDirectoryPath;
    }

    const sourceFilePath =
      sourceStoragePath + '/bitpay-recovery-phrase-template.pdf';

    try {
      const opts: ShareOptions = {
        title: 'BitPay Backup Template',
        url: `file://${sourceFilePath}`,
        type: 'application/pdf',
        subject: 'BitPay Backup Template',
        failOnCancel: false,
      };

      logger.debug('Trying to execute Share.open');
      Share.open(opts);
    } catch (err) {
      let errMsg = '';
      if (err instanceof Error) {
        errMsg = err.message;
      } else {
        errMsg = JSON.stringify(err);
      }

      logger.error(`Failed trying to execute Share.open. Error: ${errMsg}`);
      await sleep(500);
      await showErrorMessage(
        CustomErrorMessage({
          errMsg: t('The file could not be shared'),
          title: t('Uh oh, something went wrong'),
        }),
      );
    }
  };

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  return (
    <BackupOnboardingContainer accessibilityLabel="backup-onbloarding-view">
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
        }}>
        <ImageContainer>{KeyImage[themeType]}</ImageContainer>
        <TitleContainer>
          <TextAlign align={'center'}>
            <H3>{t('Would you like to backup your wallet?')}</H3>
          </TextAlign>
        </TitleContainer>
        <TextContainer>
          <TextAlign align={'center'}>
            <Paragraph>
              {t(
                'If you delete the BitPay app or lose your device, you’ll need your recovery phrase regain acess to your funds.',
              )}
            </Paragraph>
          </TextAlign>
        </TextContainer>
      </ScrollView>

      <CtaContainerAbsolute
        background={true}
        style={{
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
        }}>
        <ActionContainer>
          <Button
            accessibilityLabel="write-down-backup-button"
            buttonStyle={'primary'}
            onPress={async () => {
              haptic('impactLight');
              if (!checkPrivateKeyEncrypted(key)) {
                if (biometricLockActive) {
                  await dispatch(checkBiometricForSending());
                }
                navigation.navigate('RecoveryPhrase', {
                  keyId: key.id,
                  words: getMnemonic(key),
                  walletTermsAccepted: true,
                  context: 'keySettings',
                  key,
                });
              } else {
                dispatch(
                  AppActions.showDecryptPasswordModal(
                    buildEncryptModalConfig(
                      async ({mnemonic}: {mnemonic: string}) => {
                        navigation.navigate('RecoveryPhrase', {
                          keyId: key.id,
                          words: mnemonic.trim().split(' '),
                          walletTermsAccepted: true,
                          context: 'keySettings',
                          key,
                        });
                      },
                    ),
                  ),
                );
              }
            }}>
            {t('Write Down Recovery Phrase')}
          </Button>
        </ActionContainer>
        <ActionContainer>
          <Button
            accessibilityLabel="print-backup-button"
            buttonStyle={'secondary'}
            onPress={() => {
              printBackupTemplate();
            }}>
            {t('Print Recovery Template')}
          </Button>
        </ActionContainer>
      </CtaContainerAbsolute>
    </BackupOnboardingContainer>
  );
};

export default BackupOnboarding;
