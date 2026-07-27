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
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {
  View,
  ScrollView,
  FlatList,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
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
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import InfoIcon from '../../../components/icons/info/Info';
import RequestEncryptPasswordToggle from '../components/RequestEncryptPasswordToggle';
import {URL} from '../../../constants';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {AppActions} from '../../../store/app';
import {
  checkEncryptedKeysForEddsaMigration,
  fixWalletAddresses,
  sleep,
} from '../../../utils/helper-methods';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {
  CustomErrorMessage,
  WrongPasswordError,
} from '../components/ErrorMessages';
import {
  buildAccountList,
  buildWalletObj,
  checkPrivateKeyEncrypted,
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
import {BitpaySupportedTokenOptsByAddress} from '../../../constants/tokens';
import {useTranslation} from 'react-i18next';
import SearchComponent from '../../../components/chain-search/ChainSearch';
import {AccountRowProps} from '../../../components/list/AccountListRow';
import AccountSettingsRow from '../../../components/list/AccountSettingsRow';
import {useTheme} from '../../../contexts';
import {IsSVMChain, IsVMChain} from '../../../store/wallet/utils/currency';
import {useOngoingProcess, useTokenContext} from '../../../contexts';
import {isTSSKey} from '../../../store/wallet/effects/tss-send/tss-send';
import {logManager} from '../../../managers/LogManager';

const SCREEN_GUTTER = Number(ScreenGutter.replace('px', ''));
const ACCOUNT_LIST_READY_FALLBACK_MS = 2000;

const styles = StyleSheet.create({
  walletSettingsContainer: {
    flex: 1,
  },
  walletSettingsListContainer: {
    padding: SCREEN_GUTTER,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 18,
    marginTop: 5,
    marginBottom: 5,
  },
  walletHeaderContainer: {
    paddingTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletNameContainer: {
    paddingTop: 10,
    paddingRight: 0,
    paddingBottom: 20,
    paddingLeft: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verticalPadding: {
    paddingVertical: SCREEN_GUTTER,
    paddingHorizontal: 0,
  },
  addWalletText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 10,
    marginBottom: 10,
  },
  searchComponentContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
});

const WalletSettingsContainer: React.FC<
  React.ComponentProps<typeof SafeAreaView>
> = ({style, ...rest}) => (
  <SafeAreaView style={[styles.walletSettingsContainer, style]} {...rest} />
);

const WalletSettingsListContainer: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => (
  <View style={[styles.walletSettingsListContainer, style]} {...rest} />
);

const Title: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.title, {color: theme.colors.text}, style]}
      {...rest}
    />
  );
};

const WalletHeaderContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.walletHeaderContainer, style]} {...rest} />;

const WalletNameContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.walletNameContainer, style]} {...rest} />
);

const VerticalPadding: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.verticalPadding, style]} {...rest} />;

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

const AddWalletText: React.FC<React.ComponentProps<typeof Link>> = ({
  style,
  ...rest
}) => <Link style={[styles.addWalletText, style]} {...rest} />;

const SearchComponentContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.searchComponentContainer, style]} {...rest} />;

const KeySettings = () => {
  const {t} = useTranslation();
  const {
    params: {keyId, context},
  } = useRoute<RouteProp<WalletGroupParamList, 'KeySettings'>>();
  const scrollViewRef = useRef<ScrollView>(null);
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const theme = useTheme();
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const {tokenOptionsByAddress} = useTokenContext();
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState([] as AccountRowProps[]);
  const selectedChainFilterOption = useAppSelector(
    ({APP}) => APP.selectedChainFilterOption,
  );
  const _key: Key = useAppSelector(({WALLET}) => WALLET.keys[keyId]);
  const [accountListReady, setAccountListReady] = useState(false);
  const memorizedAccountList = useMemo(() => {
    if (!accountListReady) {
      return [];
    }

    return buildAccountList(_key, defaultAltCurrency.isoCode, {}, dispatch, {
      skipFiatCalculations: true,
    });
  }, [accountListReady, defaultAltCurrency.isoCode, dispatch, _key]);

  const accountInfo = useAppSelector(
    ({WALLET}) => WALLET.keys[keyId]?.evmAccountsInfo,
  );
  const {keyName} = _key || {};

  useEffect(() => {
    if (context === 'createEncryptPassword') {
      navigation.navigate('CreateEncryptPassword', {keyId});
      scrollViewRef?.current?.scrollToEnd({animated: false});
    }
  }, [context, keyId, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Key Settings')}</HeaderTitle>,
    });
  }, [navigation, t]);

  useEffect(() => {
    let completed = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    const complete = () => {
      if (completed) {
        return;
      }

      completed = true;
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      setAccountListReady(true);
    };

    const unsubscribe = (navigation as any).addListener(
      'transitionEnd',
      (event: {data?: {closing?: boolean}}) => {
        if (!event.data?.closing) {
          complete();
        }
      },
    );
    fallbackTimer = setTimeout(complete, ACCOUNT_LIST_READY_FALLBACK_MS);

    return () => {
      completed = true;
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      unsubscribe();
    };
  }, [navigation]);

  const buildEncryptModalConfig = useCallback(
    (
      cta: (decryptedKey: {
        mnemonic: string;
        mnemonicHasPassphrase: boolean;
        xPrivKey: string;
      }) => void,
    ) => {
      return {
        onSubmitHandler: async (encryptPassword: string) => {
          try {
            dispatch(
              checkEncryptedKeysForEddsaMigration(_key, encryptPassword),
            );
            const decryptedKey = _key.methods!.get(encryptPassword);
            dispatch(AppActions.dismissDecryptPasswordModal());
            await sleep(300);
            cta(decryptedKey);
          } catch (e: any) {
            const errStr = e instanceof Error ? e.message : JSON.stringify(e);
            logManager.error('[KeySettings] Decrypt Error', errStr);
            await dispatch(AppActions.dismissDecryptPasswordModal());
            await sleep(500);
            dispatch(showBottomNotificationModal(WrongPasswordError()));
          }
        },
        description: t('To continue please enter your encryption password.'),
        onCancelHandler: () => null,
      };
    },
    [_key, dispatch, t],
  );

  const customTokenOptionsByAddress = useAppSelector(
    ({WALLET}) => WALLET.customTokenOptionsByAddress,
  );

  const startSyncWallets = useCallback(
    async (mnemonic: string) => {
      const tokenOptionsForSync = {
        ...BitpaySupportedTokenOptsByAddress,
        ...tokenOptionsByAddress,
        ...customTokenOptionsByAddress,
      };

      if (_key.isPrivKeyEncrypted) {
        await sleep(500);
      }
      showOngoingProcess('SYNCING_WALLETS');
      const opts = {
        words: normalizeMnemonic(mnemonic),
        mnemonic,
      };
      try {
        let {key: _syncKey, wallets: _syncWallets} = await serverAssistedImport(
          opts,
        );

        if (_syncKey.fingerPrint === _key.properties!.fingerPrint) {
          _syncWallets = _syncWallets
            .filter(
              sw =>
                sw.isComplete() &&
                !sw.pendingTssSession &&
                !_key.wallets.some(ew => ew.id === sw.credentials.walletId),
            )
            .map(syncWallet => {
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
                  {
                    ...syncWallet.credentials,
                    currencyAbbreviation,
                    currencyName,
                  } as any,
                  tokenOptionsForSync,
                ),
              );
            });

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

          hideOngoingProcess();
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
          hideOngoingProcess();
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
        hideOngoingProcess();
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
    },
    [
      _key,
      customTokenOptionsByAddress,
      dispatch,
      hideOngoingProcess,
      showOngoingProcess,
      t,
      tokenOptionsByAddress,
    ],
  );

  const onPressItem = useCallback(
    (item: AccountRowProps) => {
      haptic('impactLight');
      if (IsVMChain(item.chains[0])) {
        navigation.navigate('AccountSettings', {
          keyId,
          selectedAccountAddress: item.receiveAddress,
          context: 'keySettings',
          isSvmAccount: IsSVMChain(item.chains[0]),
        });
      } else {
        const fullWalletObj = _key.wallets.find(
          wallet => wallet.id === item.wallets[0].id,
        )!;
        const {
          credentials: {walletId},
        } = fullWalletObj;
        if (!fullWalletObj.isComplete() && fullWalletObj?.pendingTssSession) {
          return;
        }
        navigation.navigate('WalletSettings', {
          keyId,
          walletId,
        });
      }
    },
    [_key, keyId, navigation],
  );

  const renderListHeaderComponent = useCallback(() => {
    return (
      <>
        <WalletNameContainer
          activeOpacity={ActiveOpacity}
          onPress={() => {
            haptic('impactLight');
            navigation.navigate('UpdateKeyOrWalletName', {
              keyId,
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

        {accountListReady ? (
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
        ) : null}
      </>
    );
  }, [
    accountListReady,
    keyId,
    keyName,
    memorizedAccountList,
    navigation,
    searchResults,
    searchVal,
    t,
    theme.dark,
  ]);

  const renderListFooterComponent = useCallback(() => {
    return (
      <>
        {_key && !_key.isReadOnly && !isTSSKey(_key) ? (
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
              onPress={async () => {
                const fullWalletObj = _key.wallets?.[0];
                if (fullWalletObj?.pendingTssSession && _key.tssSession) {
                  dispatch(
                    showBottomNotificationModal(
                      CustomErrorMessage({
                        errMsg: t(
                          'Pending TSS session. Retry after session completion.',
                        ),
                      }),
                    ),
                  );
                  return;
                } else if (isTSSKey(_key)) {
                  navigation.navigate(WalletScreens.BACKUP_SHARED_KEY, {
                    context: 'backupExistingTSSKey',
                    key: _key,
                  });
                  return;
                }
                navigation.navigate('BackupOnboarding', {
                  keyId: _key.id,
                });
              }}>
              <WalletSettingsTitle>{t('Backup')}</WalletSettingsTitle>
            </Setting>

            <Hr />

            <Setting
              onPress={() => {
                haptic('impactLight');
                navigation.navigate('KeyInformation');
              }}>
              <WalletSettingsTitle>{t('Key Information')}</WalletSettingsTitle>
            </Setting>

            <Hr />

            {!_key.wallets?.[0]?.pendingTssSession ? (
              <>
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
              </>
            ) : null}

            {checkPrivateKeyEncrypted(_key) ? (
              <>
                <SettingView>
                  <Setting
                    activeOpacity={ActiveOpacity}
                    onPress={() => {
                      navigation.navigate('ClearEncryptPassword', {
                        keyId,
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
          {_key && !_key.isReadOnly && !isTSSKey(_key) ? (
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
              navigation.navigate('DeleteKey', {keyId});
            }}>
            <WalletSettingsTitle>{t('Delete')}</WalletSettingsTitle>
          </Setting>
        </VerticalPadding>
      </>
    );
  }, [
    _key,
    buildEncryptModalConfig,
    dispatch,
    keyId,
    navigation,
    startSyncWallets,
    t,
    theme.dark,
  ]);

  const memoizedRenderItem = useCallback(
    ({item, index}: {item: AccountRowProps; index: number}) => {
      return (
        <AccountSettingsRow
          key={index.toString()}
          id={item.id}
          accountItem={item}
          accountInfo={accountInfo}
          onPress={() => {
            const fullWalletObj = _key.wallets?.[0];
            if (fullWalletObj?.pendingTssSession && _key.tssSession) {
              dispatch(
                showBottomNotificationModal(
                  CustomErrorMessage({
                    errMsg: t(
                      'Pending TSS session. Retry after session completion.',
                    ),
                  }),
                ),
              );
              return;
            }
            onPressItem(item);
          }}
        />
      );
    },
    [_key, accountInfo, dispatch, onPressItem, t],
  );

  return (
    <WalletSettingsContainer>
      <WalletSettingsListContainer>
        <FlatList<AccountRowProps>
          ListHeaderComponent={renderListHeaderComponent}
          ListFooterComponent={
            accountListReady ? renderListFooterComponent : null
          }
          data={
            !searchVal && !selectedChainFilterOption
              ? memorizedAccountList
              : searchResults
          }
          ListEmptyComponent={
            accountListReady ? null : <ActivityIndicator size="small" />
          }
          renderItem={memoizedRenderItem}
        />
      </WalletSettingsListContainer>
    </WalletSettingsContainer>
  );
};

export default KeySettings;
