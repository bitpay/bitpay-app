import React, {useLayoutEffect} from 'react';
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
import {useAppSelector} from '../../../utils/hooks';
import {findWalletById} from '../../../store/wallet/utils/wallet';
import {Wallet} from '../../../store/wallet/wallet.models';
import {AppActions} from '../../../store/app';
import {sleep} from '../../../utils/helper-methods';
import {
  showBottomNotificationModal,
  showDecryptPasswordModal,
  toggleHideAllBalances,
} from '../../../store/app/app.actions';
import {WrongPasswordError} from '../components/ErrorMessages';
import {useDispatch} from 'react-redux';
import {
  toggleHideWallet,
  updatePortfolioBalance,
} from '../../../store/wallet/wallet.actions';
import {startUpdateWalletStatus} from '../../../store/wallet/effects/status/status';
import {useTranslation} from 'react-i18next';

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

const WalletNameContainer = styled.TouchableOpacity`
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
    params: {walletId, key},
  } = useRoute<RouteProp<WalletGroupParamList, 'WalletSettings'>>();
  const navigation = useNavigation();

  const wallets = useAppSelector(({WALLET}) => WALLET.keys[key.id].wallets);
  const {hideAllBalances} = useAppSelector(({APP}) => APP);
  const wallet = findWalletById(wallets, walletId) as Wallet;
  const {
    walletName,
    credentials: {walletName: credentialsWalletName},
    hideWallet,
  } = wallet;

  const dispatch = useDispatch();

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
          const decryptedKey = key.methods!.get(encryptPassword);
          dispatch(AppActions.dismissDecryptPasswordModal());
          await sleep(300);
          cta(decryptedKey);
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

        <SettingView>
          <WalletSettingsTitle>{t('Hide Wallet')}</WalletSettingsTitle>

          <ToggleSwitch
            onChange={async () => {
              dispatch(toggleHideWallet({wallet}));
              dispatch(startUpdateWalletStatus({key, wallet, force: true}));
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

        <SettingView>
          <WalletSettingsTitle>{t('Hide All Balances')}</WalletSettingsTitle>

          <ToggleSwitch
            onChange={value => dispatch(toggleHideAllBalances(value))}
            isEnabled={!!hideAllBalances}
          />
        </SettingView>

        <Hr />

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
                  if (key.methods!.isPrivKeyEncrypted()) {
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
                    navigation.navigate('ExportWallet', {
                      wallet,
                      keyObj: {...key.methods!.get(), ..._keyObj},
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
