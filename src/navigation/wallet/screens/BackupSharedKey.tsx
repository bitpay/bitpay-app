import React, {useLayoutEffect} from 'react';
import styled from 'styled-components/native';
import {H3, Paragraph, TextAlign} from '../../../components/styled/Text';
import {
  CtaContainer as _CtaContainer,
  HeaderRightContainer,
  ImageContainer,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import haptic from '../../../components/haptic-feedback/haptic';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {Key} from '../../../store/wallet/wallet.models';
import {useNavigation} from '@react-navigation/native';
import {CommonActions} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../tabs/TabsStack';
import BackupKeyShare from '../../../../assets/img/backup-keyshare.svg';
import Banner from '../../../components/banner/Banner';
import {checkPrivateKeyEncrypted} from '../../../store/wallet/utils/wallet';
import {getDecryptPassword} from '../../../store/wallet/effects';
import {WrongPasswordError} from '../components/ErrorMessages';
import {useAppDispatch} from '../../../utils/hooks';
import {IsVMChain} from '../../../store/wallet/utils/currency';

type BackupSharedKeyScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
  WalletScreens.BACKUP_SHARED_KEY
>;

export type BackupSharedKeyParamList = {
  context: 'createNewTSSKey' | 'joinTSSKey' | 'backupExistingTSSKey';
  key: Key;
};

const BackupContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollViewContainer = styled.ScrollView`
  padding: 0 15px;
`;

const ContentContainer = styled.View`
  align-items: center;
`;

const CtaContainer = styled(_CtaContainer)`
  padding: 10px 0;
`;

const BackupSharedKeyScreen = ({route}: BackupSharedKeyScreenProps) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();

  const {context, key} = route.params;

  const navigateToKeyOverview = () => {
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
        key,
      },
    };

    const routes = IsVMChain(key.wallets[0].chain)
      ? [...baseRoutes, AccountDetailsRoute, walletDetailsRoute]
      : [...baseRoutes, walletDetailsRoute];

    navigation.dispatch(
      CommonActions.reset({
        index: routes.length - 1,
        routes,
      }),
    );
  };

  const gotoBackup = async () => {
    if (!checkPrivateKeyEncrypted(key)) {
      navigation.navigate(WalletScreens.EXPORT_TSS_WALLET, {
        context,
        keyId: key.id,
      });
    } else {
      try {
        const decryptPassword = await dispatch(getDecryptPassword(key));
        navigation.navigate(WalletScreens.EXPORT_TSS_WALLET, {
          context,
          keyId: key.id,
          decryptPassword,
        });
      } catch (err: any) {
        if (err.message === 'invalid password') {
          dispatch(showBottomNotificationModal(WrongPasswordError()));
        }
      }
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: context === 'backupExistingTSSKey',
      headerLeft: context === 'backupExistingTSSKey' ? undefined : () => null,
      headerRight: () =>
        context !== 'backupExistingTSSKey' ? (
          <HeaderRightContainer>
            <Button
              accessibilityLabel="skip-button"
              buttonType={'pill'}
              onPress={async () => {
                haptic('impactLight');
                dispatch(
                  showBottomNotificationModal({
                    type: 'warning',
                    title: t('Are you sure?'),
                    message: t(
                      'Without your keyshare backup, you may lose access to your funds if you lose this device.',
                    ),
                    enableBackdropDismiss: true,
                    actions: [
                      {
                        text: t('BACKUP KEYSHARE'),
                        action: gotoBackup,
                        primary: true,
                      },
                      {
                        text: t('LATER'),
                        action: navigateToKeyOverview,
                      },
                    ],
                  }),
                );
              }}>
              {t('Skip')}
            </Button>
          </HeaderRightContainer>
        ) : null,
    });
  }, [navigation, t, context]);

  useAndroidBackHandler(() => true);

  return (
    <BackupContainer accessibilityLabel="backup-shared-key-container">
      <ScrollViewContainer>
        <ContentContainer>
          <ImageContainer style={{marginTop: 32, marginBottom: 32}}>
            <BackupKeyShare />
          </ImageContainer>
          <TitleContainer>
            <TextAlign align={'center'}>
              <H3>{t('Would you like to backup your keyshare?')}</H3>
            </TextAlign>
          </TitleContainer>
          <TextContainer>
            <TextAlign align={'center'}>
              <Paragraph>
                {t(
                  "If you delete the BitPay app or lose your device, you'll need your keyshare file to regain access to your funds.",
                )}
              </Paragraph>
            </TextAlign>
          </TextContainer>
        </ContentContainer>

        <CtaContainer>
          <Banner
            type={'info'}
            title={t("Don't lose access")}
            description={t(
              "Your shared wallet uses an M-of-N setup. If the required number of co-signers are lost or unavailable, you will not be able to sign transactions or recover assets. Back up your wallet securely. BitPay can't recover your wallet or access your private keys.",
            )}
            link={{
              text: t('Learn More'),
              onPress: () => {},
            }}
          />
        </CtaContainer>

        <CtaContainer>
          <Button
            accessibilityLabel="backup-shared-wallet-button"
            buttonStyle={'primary'}
            onPress={gotoBackup}>
            {t('Backup Shared Wallet')}
          </Button>
        </CtaContainer>
      </ScrollViewContainer>
    </BackupContainer>
  );
};

export default BackupSharedKeyScreen;
