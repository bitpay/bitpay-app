import React, {useEffect, useLayoutEffect, useState} from 'react';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import {View} from 'react-native';
import styled from 'styled-components/native';
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
import {Wallet} from '../../../store/wallet/wallet.models';
import {AppActions} from '../../../store/app';
import {sleep} from '../../../utils/helper-methods';
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
import {Constants} from 'bitcore-wallet-client/ts_build/lib/common';

const WalletSettingsContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const Title = styled(BaseText)`
  font-weight: bold;
  font-size: 18px;
  margin: 5px 0;
  color: ${({theme}) => theme.colors.text};
`;

const WalletNameContainer = styled(TouchableOpacity)`
  padding: 10px 0 20px 0;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const InfoDescription = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const VerticalPadding = styled.View`
  padding: ${ScreenGutter} 0;
`;

const WalletSettingsTitle = styled(SettingTitle)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const WalletSettings = () => {
  const {t} = useTranslation();
  const {
    params: {walletId, key, copayerId},
  } = useRoute<RouteProp<WalletGroupParamList, 'WalletSettings'>>();
  const navigation = useNavigation();

  const wallets = useAppSelector(({WALLET}) => WALLET.keys[key.id].wallets);
  const evmAccountsInfo = useAppSelector(
    ({WALLET}) => WALLET.keys[key.id].evmAccountsInfo,
  );
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
          console.log(`Decrypt Error: ${e}`);
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
  });
  return (
    <WalletSettingsContainer>
      <ScrollView>
        <WalletNameContainer
          activeOpacity={ActiveOpacity}
          onPress={() => {
            haptic('impactLight');
            navigation.navigate('UpdateKeyOrWalletName', {
              key,
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
              navigation.navigate('WalletInformation', {wallet});
            }}>
            <WalletSettingsTitle>{t('Information')}</WalletSettingsTitle>
          </Setting>
          <Hr />

          <Setting
            activeOpacity={ActiveOpacity}
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('Addresses', {wallet});
            }}>
            <WalletSettingsTitle>{t('Addresses')}</WalletSettingsTitle>
          </Setting>
          <Hr />

          <Setting
            activeOpacity={ActiveOpacity}
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('ExportTransactionHistory', {wallet});
            }}>
            <WalletSettingsTitle>
              {t('Export Transaction History')}
            </WalletSettingsTitle>
          </Setting>
          <Hr />

          {!key.isReadOnly ? (
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
                            wallet,
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
                      wallet,
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
                wallet,
                key,
              });
            }}>
            <WalletSettingsTitle>
              {t('Clear Transaction History Cache')}
            </WalletSettingsTitle>
          </Setting>
          <Hr />
        </VerticalPadding>
      </ScrollView>
    </WalletSettingsContainer>
  );
};

export default WalletSettings;
