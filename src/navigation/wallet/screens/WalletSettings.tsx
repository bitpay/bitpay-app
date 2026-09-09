import React, {useEffect, useLayoutEffect, useState} from 'react';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import {SafeAreaView, ScrollView, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../contexts';
import {
  ActiveOpacity,
  Hr,
  Info,
  InfoTriangle,
  ScreenGutter,
  Setting,
  SettingTitle,
  SettingView,
} from '../../../components/styled/Containers';
import ChevronRightSvg from '../../../../assets/img/angle-right.svg';
import haptic from '../../../components/haptic-feedback/haptic';

import {SlateDark, White} from '../../../styles/colors';
import ToggleSwitch from '../../../components/toggle-switch/ToggleSwitch';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  checkPrivateKeyEncrypted,
  findWalletById,
} from '../../../store/wallet/utils/wallet';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import {AppActions} from '../../../store/app';
import {
  checkEncryptedKeysForEddsaMigration,
  sleep,
} from '../../../utils/helper-methods';
import {
  showBottomNotificationModal,
  showDecryptPasswordModal,
} from '../../../store/app/app.actions';
import {WrongPasswordError} from '../components/ErrorMessages';
import {
  toggleHideAccount,
  toggleHideWallet,
  updatePortfolioBalance,
} from '../../../store/wallet/wallet.actions';
import {
  startUpdateAllWalletStatusForKey,
  startUpdateWalletStatus,
} from '../../../store/wallet/effects/status/status';
import {useTranslation} from 'react-i18next';
import {IsVMChain} from '../../../store/wallet/utils/currency';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {BwcProvider} from '../../../lib/bwc';
import {isTSSKey} from '../../../store/wallet/effects/tss-send/tss-send';
import {logManager} from '../../../managers/LogManager';

const Constants = BwcProvider.getInstance().getConstants();

const gutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    marginTop: 20,
    paddingHorizontal: gutter,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 18,
    marginVertical: 5,
  },
  walletNameContainer: {
    paddingTop: 10,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoDescription: {
    fontSize: 16,
  },
  verticalPadding: {
    paddingVertical: gutter,
  },
});

const Title: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const theme = useTheme();
  return (
    <BaseText style={[styles.title, {color: theme.colors.text}]}>
      {children}
    </BaseText>
  );
};

const WalletNameContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.walletNameContainer, style]} {...rest} />
);

const InfoDescription: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.infoDescription, {color: theme.dark ? White : SlateDark}]}>
      {children}
    </BaseText>
  );
};

const VerticalPadding: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.verticalPadding}>{children}</View>;

const WalletSettingsTitle: React.FC<
  React.ComponentProps<typeof SettingTitle>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <SettingTitle
      style={[{color: theme.dark ? White : SlateDark}, style]}
      {...rest}
    />
  );
};

const WalletSettings = () => {
  const {t} = useTranslation();
  const {
    params: {walletId, keyId, copayerId},
  } = useRoute<RouteProp<WalletGroupParamList, 'WalletSettings'>>();
  const navigation = useNavigation();

  const key = useAppSelector(({WALLET}) => WALLET.keys[keyId]) as Key;
  const wallets: Wallet[] = key.wallets;
  const evmAccountsInfo = key.evmAccountsInfo;
  const wallet = findWalletById(wallets, walletId, copayerId) as Wallet;
  const [hadVisibleWallet, setHadVisibleWallet] = useState(() =>
    wallets.some(w => w.hideWallet === false && IsVMChain(w.chain)),
  );

  const [hideAccount, setHideAccount] = useState(() =>
    wallet.receiveAddress
      ? evmAccountsInfo?.[wallet.receiveAddress]?.hideAccount
      : false,
  );

  const [accountToggleSelected, setAccountToggleSelected] = useState(() =>
    wallet.receiveAddress
      ? evmAccountsInfo?.[wallet.receiveAddress]?.accountToggleSelected
      : false,
  );

  useEffect(() => {
    setHadVisibleWallet(wallets.some(w => !w.hideWallet && IsVMChain(w.chain)));
  }, [wallets]);

  useEffect(() => {
    if (wallet.receiveAddress) {
      const {hideAccount, accountToggleSelected} =
        evmAccountsInfo?.[wallet.receiveAddress] || {};
      setHideAccount(hideAccount ?? false);
      setAccountToggleSelected(accountToggleSelected ?? false);
    }
  }, [evmAccountsInfo, wallet.receiveAddress]);

  const {
    walletName,
    credentials: {walletName: credentialsWalletName},
    hideWallet,
  } = wallet;
  const dispatch = useAppDispatch();

  const buildEncryptModalConfig = (
    cta: (decryptedKey: {
      mnemonicHasPassphrase: boolean;
      mnemonic: string;
      xPrivKey: string;
    }) => void,
  ) => {
    return {
      onSubmitHandler: async (encryptPassword: string) => {
        try {
          const combinedKey: any = {};
          dispatch(checkEncryptedKeysForEddsaMigration(key, encryptPassword));
          Object.values(Constants.ALGOS).forEach(algo => {
            const keyData = key.methods!.get(encryptPassword, algo);
            if (algo === 'EDDSA') {
              keyData.xPrivKeyEDDSA = keyData.xPrivKey;
            }
            Object.assign(combinedKey, keyData);
          });
          dispatch(AppActions.dismissDecryptPasswordModal());
          await sleep(300);
          cta(combinedKey);
        } catch (e) {
          const errStr = e instanceof Error ? e.message : JSON.stringify(e);
          logManager.debug(`Decrypt Error: ${errStr}`);
          await dispatch(AppActions.dismissDecryptPasswordModal());
          await sleep(500); // Wait to close Decrypt Password modal
          dispatch(showBottomNotificationModal(WrongPasswordError()));
        }
      },
      description: t('To continue please enter your encryption password.'),
      onCancelHandler: () => null,
    };
  };

  const handleToggleAndUpdateAccount = (
    keyId: string,
    accountAddress: string,
  ) => {
    dispatch(toggleHideAccount({keyId, accountAddress}));
    dispatch(
      startUpdateAllWalletStatusForKey({
        key,
        force: true,
        createTokenWalletWithFunds: false,
      }),
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Wallet Settings')}</HeaderTitle>,
    });
  }, [navigation, t]);
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <WalletNameContainer
          activeOpacity={ActiveOpacity}
          onPress={() => {
            haptic('impactLight');
            navigation.navigate('UpdateKeyOrWalletName', {
              keyId,
              wallet: {
                walletId,
                walletName: walletName || credentialsWalletName,
              },
              context: 'wallet',
            });
          }}>
          <View>
            <Title>{t('Name')}</Title>
            <WalletSettingsTitle>
              {walletName || credentialsWalletName}
            </WalletSettingsTitle>
          </View>

          <ChevronRightSvg height={16} />
        </WalletNameContainer>

        <Hr />

        {!accountToggleSelected ? (
          <>
            <SettingView>
              <WalletSettingsTitle>{t('Hide Wallet')}</WalletSettingsTitle>

              <ToggleSwitch
                onChange={async () => {
                  dispatch(toggleHideWallet({wallet}));
                  dispatch(startUpdateWalletStatus({key, wallet, force: true}));
                  if (IsVMChain(wallet.chain)) {
                    const hasVisibleWallet = key.wallets.some(
                      w => w.hideWallet === false && IsVMChain(w.chain),
                    );
                    if (wallet.receiveAddress) {
                      const accountAddress = wallet.receiveAddress;
                      if (!hasVisibleWallet && !hideAccount) {
                        handleToggleAndUpdateAccount(key.id, accountAddress);
                      } else if (hasVisibleWallet && !hadVisibleWallet) {
                        handleToggleAndUpdateAccount(key.id, accountAddress);
                      }
                    }
                  }
                  await sleep(1000);
                  dispatch(updatePortfolioBalance());
                }}
                isEnabled={!!hideWallet}
              />
            </SettingView>
            {!hideWallet ? (
              <Info>
                <InfoTriangle />
                <InfoDescription>
                  {t('This wallet will not be removed from the device.')}
                </InfoDescription>
              </Info>
            ) : null}
            <Hr />
          </>
        ) : null}

        <VerticalPadding>
          <Title>{t('Advanced')}</Title>
          <Setting
            activeOpacity={ActiveOpacity}
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('WalletInformation', {
                keyId,
                walletId,
                copayerId,
              });
            }}>
            <WalletSettingsTitle>{t('Information')}</WalletSettingsTitle>
          </Setting>
          <Hr />

          <Setting
            activeOpacity={ActiveOpacity}
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('Addresses', {
                keyId,
                walletId,
                copayerId,
              });
            }}>
            <WalletSettingsTitle>{t('Addresses')}</WalletSettingsTitle>
          </Setting>
          <Hr />

          <Setting
            activeOpacity={ActiveOpacity}
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('ExportTransactionHistory', {
                keyId,
                walletId,
                copayerId,
              });
            }}>
            <WalletSettingsTitle>
              {t('Export Transaction History')}
            </WalletSettingsTitle>
          </Setting>
          <Hr />

          {!key.isReadOnly && !isTSSKey(key) ? (
            <>
              <Setting
                activeOpacity={ActiveOpacity}
                onPress={() => {
                  haptic('impactLight');
                  const {
                    compliantDerivation,
                    fingerPrint,
                    id,
                    use0forBCH,
                    use44forMultisig,
                  } = key.methods!;
                  const _keyObj = {
                    compliantDerivation,
                    fingerPrint,
                    id,
                    use0forBCH,
                    use44forMultisig,
                  };
                  if (checkPrivateKeyEncrypted(key)) {
                    dispatch(
                      showDecryptPasswordModal(
                        buildEncryptModalConfig(async decryptedKey => {
                          navigation.navigate('ExportWallet', {
                            keyId,
                            walletId,
                            copayerId,
                            keyObj: {...decryptedKey, ..._keyObj},
                          });
                        }),
                      ),
                    );
                  } else {
                    const combinedKey: any = {};
                    Object.values(Constants.ALGOS).forEach(algo => {
                      const keyData = key.methods!.get(undefined, algo);
                      if (algo === 'EDDSA') {
                        keyData.xPrivKeyEDDSA = keyData.xPrivKey;
                      }
                      Object.assign(combinedKey, keyData);
                    });
                    navigation.navigate('ExportWallet', {
                      keyId,
                      walletId,
                      copayerId,
                      keyObj: {...combinedKey, ..._keyObj},
                    });
                  }
                }}>
                <WalletSettingsTitle>{t('Export Wallet')}</WalletSettingsTitle>
              </Setting>
              <Hr />
            </>
          ) : null}

          <Setting
            activeOpacity={ActiveOpacity}
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('ClearTransactionHistoryCache', {
                keyId,
                walletId,
                copayerId,
              });
            }}>
            <WalletSettingsTitle>
              {t('Clear Transaction History Cache')}
            </WalletSettingsTitle>
          </Setting>
          <Hr />
        </VerticalPadding>
      </ScrollView>
    </SafeAreaView>
  );
};

export default WalletSettings;
