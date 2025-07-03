import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BaseText,
  HeaderTitle,
  Link,
  InfoTitle,
  InfoHeader,
  InfoDescription,
} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import {View, ScrollView, FlatList} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
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
  InfoImageContainer,
} from '../../../components/styled/Containers';
import ChevronRightSvg from '../../../../assets/img/angle-right.svg';
import haptic from '../../../components/haptic-feedback/haptic';
import {Slate, SlateDark, White} from '../../../styles/colors';
import {
  openUrlWithInAppBrowser,
  startOnGoingProcessModal,
} from '../../../store/app/app.effects';
import InfoIcon from '../../../components/icons/info/Info';
import RequestEncryptPasswordToggle from '../components/RequestEncryptPasswordToggle';
import {URL} from '../../../constants';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {AppActions} from '../../../store/app';
import {fixWalletAddresses, sleep} from '../../../utils/helper-methods';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {
  CustomErrorMessage,
  WrongPasswordError,
} from '../components/ErrorMessages';
import {
  buildAccountList,
  buildWalletObj,
  checkPrivateKeyEncrypted,
  generateKeyExportCode,
  mapAbbreviationAndName,
} from '../../../store/wallet/utils/wallet';
import {Key} from '../../../store/wallet/wallet.models';
import {
  normalizeMnemonic,
  serverAssistedImport,
} from '../../../store/wallet/effects';
import merge from 'lodash.merge';
import {syncWallets} from '../../../store/wallet/wallet.actions';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {RootState} from '../../../store';
import {BitpaySupportedTokenOptsByAddress} from '../../../constants/tokens';
import {useTranslation} from 'react-i18next';
import SearchComponent from '../../../components/chain-search/ChainSearch';
import {AccountRowProps} from '../../../components/list/AccountListRow';
import AccountSettingsRow from '../../../components/list/AccountSettingsRow';
import {useTheme} from 'styled-components/native';
import {IsSVMChain, IsVMChain} from '../../../store/wallet/utils/currency';

const WalletSettingsContainer = styled.SafeAreaView`
  flex: 1;
`;

const WalletSettingsListContainer = styled.View`
  padding: ${ScreenGutter};
`;

const Title = styled(BaseText)`
  font-weight: bold;
  font-size: 18px;
  margin: 5px 0;
  color: ${({theme}) => theme.colors.text};
`;

const WalletHeaderContainer = styled.View`
  padding-top: 15px;
  flex-direction: row;
  align-items: center;
`;

const WalletNameContainer = styled(TouchableOpacity)`
  padding: 10px 0 20px 0;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const VerticalPadding = styled.View`
  padding: ${ScreenGutter} 0;
`;

const WalletSettingsTitle = styled(SettingTitle)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const AddWalletText = styled(Link)`
  font-size: 18px;
  font-weight: 500;
  margin: 10px 0;
`;

const SearchComponentContainer = styled.View`
  margin: 20px 0;
`;

const KeySettings = () => {
  const {t} = useTranslation();
  const {
    params: {key, context},
  } = useRoute<RouteProp<WalletGroupParamList, 'KeySettings'>>();
  const scrollViewRef = useRef<ScrollView>(null);
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const theme = useTheme();
  const {defaultAltCurrency} = useAppSelector(({APP}) => APP);
  const {rates} = useAppSelector(({RATE}) => RATE);
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState([] as AccountRowProps[]);
  const selectedChainFilterOption = useAppSelector(
    ({APP}) => APP.selectedChainFilterOption,
  );
  const _key: Key = useAppSelector(({WALLET}) => WALLET.keys[key.id]);
  const memorizedAccountList = useMemo(() => {
    return buildAccountList(_key, defaultAltCurrency.isoCode, rates, dispatch, {
      skipFiatCalculations: true,
    });
  }, [dispatch, _key, defaultAltCurrency.isoCode, rates]);

  const accountInfo = useAppSelector(
    ({WALLET}) => WALLET.keys[key.id]?.evmAccountsInfo,
  );
  const {keyName} = _key || {};

  useEffect(() => {
    if (context === 'createEncryptPassword') {
      navigation.navigate('CreateEncryptPassword', {key: _key});
      scrollViewRef?.current?.scrollToEnd({animated: false});
    }
  }, [context, _key, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Key Settings')}</HeaderTitle>,
    });
  });

  const buildEncryptModalConfig = (
    cta: (decryptedKey: {
      mnemonic: string;
      mnemonicHasPassphrase: boolean;
      xPrivKey: string;
    }) => void,
  ) => {
    return {
      onSubmitHandler: async (encryptPassword: string) => {
        try {
          const decryptedKey = _key.methods!.get(encryptPassword);
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

  const _tokenOptionsByAddress = useAppSelector(({WALLET}: RootState) => {
    return {
      ...BitpaySupportedTokenOptsByAddress,
      ...WALLET.tokenOptionsByAddress,
      ...WALLET.customTokenOptionsByAddress,
    };
  });

  const startSyncWallets = async (mnemonic: string) => {
    if (_key.isPrivKeyEncrypted) {
      // To close decrypt modal
      await sleep(500);
    }
    await dispatch(startOnGoingProcessModal('SYNCING_WALLETS'));
    const opts = {
      words: normalizeMnemonic(mnemonic),
      mnemonic,
    };
    try {
      let {key: _syncKey, wallets: _syncWallets} = await serverAssistedImport(
        opts,
      );

      if (_syncKey.fingerPrint === _key.properties!.fingerPrint) {
        // Filter for new wallets
        _syncWallets = _syncWallets
          .filter(
            sw =>
              sw.isComplete() &&
              !_key.wallets.some(ew => ew.id === sw.credentials.walletId),
          )
          .map(syncWallet => {
            // update to keyId
            syncWallet.credentials.keyId = _key.properties!.id;
            const {currencyAbbreviation, currencyName} = dispatch(
              mapAbbreviationAndName(
                syncWallet.credentials.coin,
                syncWallet.credentials.chain,
                syncWallet.credentials.token?.address,
              ),
            );
            return merge(
              syncWallet,
              buildWalletObj(
                {...syncWallet.credentials, currencyAbbreviation, currencyName},
                _tokenOptionsByAddress,
              ),
            );
          });

        // workaround for fixing wallets without receive address
        await fixWalletAddresses({
          appDispatch: dispatch,
          wallets: _syncWallets,
        });

        let message;

        const syncWalletsLength = _syncWallets.length;
        if (syncWalletsLength) {
          message =
            syncWalletsLength === 1
              ? t('New wallet found')
              : t('wallets found', {syncWalletsLength});
          dispatch(syncWallets({keyId: _key.id, wallets: _syncWallets}));
        } else {
          message = t('Your key is already synced');
        }

        dispatch(dismissOnGoingProcessModal());
        await sleep(500);
        dispatch(
          showBottomNotificationModal({
            type: 'success',
            title: t('Sync wallet'),
            message,
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
      } else {
        dispatch(dismissOnGoingProcessModal());
        await sleep(500);
        await dispatch(
          showBottomNotificationModal(
            CustomErrorMessage({
              errMsg: t('Failed to Sync wallets'),
            }),
          ),
        );
      }
    } catch (e) {
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      await dispatch(
        showBottomNotificationModal(
          CustomErrorMessage({
            errMsg: BWCErrorMessage(e),
            title: t('Error'),
          }),
        ),
      );
    }
  };

  const onPressItem = (item: AccountRowProps) => {
    haptic('impactLight');
    if (IsVMChain(item.chains[0])) {
      navigation.navigate('AccountSettings', {
        key: _key,
        selectedAccountAddress: item.receiveAddress,
        context: 'keySettings',
        isSvmAccount: IsSVMChain(item.chains[0]),
      });
    } else {
      const fullWalletObj = key.wallets.find(k => k.id === item.wallets[0].id)!;
      const {
        credentials: {walletId},
      } = fullWalletObj;
      if (!fullWalletObj.isComplete()) {
        return;
      }
      navigation.navigate('WalletSettings', {
        key: _key,
        walletId,
      });
    }
  };

  const renderListHeaderComponent = useCallback(() => {
    return (
      <>
        <WalletNameContainer
          activeOpacity={ActiveOpacity}
          onPress={() => {
            haptic('impactLight');
            navigation.navigate('UpdateKeyOrWalletName', {
              key: _key,
              context: 'key',
            });
          }}>
          <View>
            <Title>{t('Key Name')}</Title>
            <WalletSettingsTitle>{keyName}</WalletSettingsTitle>
          </View>

          <ChevronRightSvg height={16} />
        </WalletNameContainer>
        <Hr />

        <WalletHeaderContainer>
          <Title>{t('Wallets')}</Title>
          <InfoImageContainer infoMargin={'0 0 0 8px'}>
            <TouchableOpacity
              onPress={() => {
                haptic('impactLight');
                navigation.navigate('KeyExplanation');
              }}>
              <InfoIcon bgColor={theme.dark ? Slate : undefined} />
            </TouchableOpacity>
          </InfoImageContainer>
        </WalletHeaderContainer>

        <SearchComponentContainer>
          <SearchComponent<AccountRowProps>
            searchVal={searchVal}
            setSearchVal={setSearchVal}
            searchResults={searchResults}
            setSearchResults={setSearchResults}
            searchFullList={memorizedAccountList}
            context={'keysettings'}
          />
        </SearchComponentContainer>
      </>
    );
  }, [_key, keyName]);

  const renderListFooterComponent = useCallback(() => {
    return (
      <>
        {_key && !_key.isReadOnly ? (
          <VerticalPadding style={{alignItems: 'center'}}>
            <AddWalletText
              onPress={() => {
                haptic('impactLight');
                navigation.navigate('AddingOptions', {key: _key});
              }}>
              {t('Add Wallet')}
            </AddWalletText>
          </VerticalPadding>
        ) : null}

        {_key && !_key.isReadOnly ? (
          <VerticalPadding>
            <Title>{t('Security')}</Title>
            <Setting
              onPress={() => {
                navigation.navigate('BackupOnboarding', {
                  key: _key,
                  buildEncryptModalConfig,
                });
              }}>
              <WalletSettingsTitle>{t('Backup')}</WalletSettingsTitle>
            </Setting>

            <Hr />

            <SettingView style={{paddingLeft: 15, paddingRight: 15}}>
              <WalletSettingsTitle>
                {t('Request Encrypt Password')}
              </WalletSettingsTitle>

              <RequestEncryptPasswordToggle currentKey={_key} />
            </SettingView>

            <Info>
              <InfoTriangle />

              <InfoHeader>
                <InfoImageContainer infoMargin={'0 8px 0 0'}>
                  <InfoIcon bgColor={theme.dark ? Slate : undefined} />
                </InfoImageContainer>

                <InfoTitle>{t('Password Not Recoverable')}</InfoTitle>
              </InfoHeader>
              <InfoDescription>
                {t(
                  'This password cannot be recovered. If this password is lost, funds can only be recovered by reimporting your 12-word recovery phrase.',
                )}
              </InfoDescription>

              <VerticalPadding>
                <TouchableOpacity
                  activeOpacity={ActiveOpacity}
                  onPress={() => {
                    haptic('impactLight');
                    dispatch(
                      openUrlWithInAppBrowser(URL.HELP_SPENDING_PASSWORD),
                    );
                  }}>
                  <Link>{t('Learn More')}</Link>
                </TouchableOpacity>
              </VerticalPadding>
            </Info>

            <Hr />

            {checkPrivateKeyEncrypted(_key) ? (
              <>
                <SettingView>
                  <Setting
                    activeOpacity={ActiveOpacity}
                    onPress={() => {
                      navigation.navigate('ClearEncryptPassword', {
                        keyId: key.id,
                      });
                    }}>
                    <WalletSettingsTitle>
                      {t('Clear Encrypt Password')}
                    </WalletSettingsTitle>
                  </Setting>
                </SettingView>
                <Hr />
              </>
            ) : null}
          </VerticalPadding>
        ) : null}

        <VerticalPadding>
          <Title>{t('Advanced')}</Title>
          {_key && !_key.isReadOnly ? (
            <>
              <Setting
                activeOpacity={ActiveOpacity}
                onPress={() => {
                  haptic('impactLight');
                  if (!_key.isPrivKeyEncrypted) {
                    startSyncWallets(_key.properties!.mnemonic);
                  } else {
                    dispatch(
                      AppActions.showDecryptPasswordModal(
                        buildEncryptModalConfig(async ({mnemonic}) => {
                          startSyncWallets(mnemonic);
                        }),
                      ),
                    );
                  }
                }}>
                <WalletSettingsTitle>
                  {t('Sync Wallets Across Devices')}
                </WalletSettingsTitle>
              </Setting>
              <Hr />
            </>
          ) : null}

          {/* {_key && !_key.isReadOnly ? (
            <>
              <Setting
                activeOpacity={ActiveOpacity}
                onPress={() => {
                  haptic('impactLight');
                  if (!_key.isPrivKeyEncrypted) {
                    navigation.navigate('ExportKey', {
                      code: generateKeyExportCode(
                        _key,
                        _key.properties!.mnemonic,
                      ),
                      keyName,
                    });
                  } else {
                    dispatch(
                      AppActions.showDecryptPasswordModal(
                        buildEncryptModalConfig(async ({mnemonic}) => {
                          const code = generateKeyExportCode(_key, mnemonic);
                          navigation.navigate('ExportKey', {code, keyName});
                        }),
                      ),
                    );
                  }
                }}>
                <WalletSettingsTitle>{t('Export Key')}</WalletSettingsTitle>
              </Setting>

              <Hr />
            </>
          ) : null} */}

          {/* {_key && !_key.isReadOnly ? (
            <>
              <Setting
                activeOpacity={ActiveOpacity}
                onPress={() => {
                  haptic('impactLight');
                  if (!_key.isPrivKeyEncrypted) {
                    navigation.navigate('ExtendedPrivateKey', {
                      xPrivKey: _key.properties!.xPrivKey,
                    });
                  } else {
                    dispatch(
                      AppActions.showDecryptPasswordModal(
                        buildEncryptModalConfig(async ({xPrivKey}) => {
                          navigation.navigate('ExtendedPrivateKey', {xPrivKey});
                        }),
                      ),
                    );
                  }
                }}>
                <WalletSettingsTitle>
                  {t('Extended Private Key')}
                </WalletSettingsTitle>
              </Setting>

              <Hr />
            </>
          ) : null} */}

          <Setting
            activeOpacity={ActiveOpacity}
            style={{marginBottom: 50}}
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('DeleteKey', {keyId: key.id});
            }}>
            <WalletSettingsTitle>{t('Delete')}</WalletSettingsTitle>
          </Setting>
        </VerticalPadding>
      </>
    );
  }, [_key]);

  const memoizedRenderItem = useCallback(
    ({item, index}: {item: AccountRowProps; index: number}) => {
      return (
        <AccountSettingsRow
          key={index.toString()}
          id={item.id}
          accountItem={item}
          accountInfo={accountInfo}
          onPress={() => onPressItem(item)}
        />
      );
    },
    [_key],
  );

  return (
    <WalletSettingsContainer>
      <WalletSettingsListContainer>
        <FlatList<AccountRowProps>
          ListHeaderComponent={renderListHeaderComponent}
          ListFooterComponent={renderListFooterComponent}
          data={
            !searchVal && !selectedChainFilterOption
              ? memorizedAccountList
              : searchResults
          }
          renderItem={memoizedRenderItem}
        />
      </WalletSettingsListContainer>
    </WalletSettingsContainer>
  );
};

export default KeySettings;
