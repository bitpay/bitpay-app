import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  CommonActions,
  RouteProp,
  useNavigation,
  useRoute,
  useTheme,
} from '@react-navigation/native';
import {FlashList} from '@shopify/flash-list';
import {LogBox, RefreshControl, View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import styled from 'styled-components/native';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  Balance,
  BaseText,
  H2,
  H5,
  HeaderTitle,
  ProposalBadge,
} from '../../../components/styled/Text';
import Settings from '../../../components/settings/Settings';
import {
  ActiveOpacity,
  ScreenGutter,
  HeaderRightContainer as _HeaderRightContainer,
  ProposalBadgeContainer,
  EmptyListContainer,
  ChevronContainer,
} from '../../../components/styled/Containers';
import {RootState} from '../../../store';
import {
  showBottomNotificationModal,
  toggleHideAllBalances,
  dismissOnGoingProcessModal,
} from '../../../store/app/app.actions';
import {startUpdateAllWalletStatusForKey} from '../../../store/wallet/effects/status/status';
import {
  successAddWallet,
  updatePortfolioBalance,
  syncWallets,
} from '../../../store/wallet/wallet.actions';
import {KeyMethods, Status, Wallet} from '../../../store/wallet/wallet.models';
import {
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../styles/colors';
import {
  createWalletsForAccounts,
  formatFiatAmount,
  shouldScale,
  sleep,
  fixWalletAddresses,
  getEvmGasWallets,
} from '../../../utils/helper-methods';
import {
  BalanceUpdateError,
  CustomErrorMessage,
} from '../components/ErrorMessages';
import OptionsSheet, {Option} from '../components/OptionsSheet';
import Icons from '../components/WalletIcons';
import {WalletGroupParamList} from '../WalletGroup';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {
  getDecryptPassword,
  startGetRates,
  normalizeMnemonic,
  serverAssistedImport,
} from '../../../store/wallet/effects';
import EncryptPasswordImg from '../../../../assets/img/tinyicon-encrypt.svg';
import EncryptPasswordDarkModeImg from '../../../../assets/img/tinyicon-encrypt-darkmode.svg';
import {useTranslation} from 'react-i18next';
import {
  buildAccountList,
  mapAbbreviationAndName,
  buildWalletObj,
  checkPrivateKeyEncrypted,
} from '../../../store/wallet/utils/wallet';
import {each} from 'lodash';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import CoinbaseDropdownOption from '../components/CoinbaseDropdownOption';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../../navigation/tabs/TabsStack';
import {CoinbaseScreens} from '../../../navigation/coinbase/CoinbaseGroup';
import SearchComponent from '../../../components/chain-search/ChainSearch';
import {
  IsEVMChain,
  IsSVMChain,
  IsVMChain,
} from '../../../store/wallet/utils/currency';
import AccountListRow, {
  AccountRowProps,
} from '../../../components/list/AccountListRow';
import _ from 'lodash';
import DropdownOption from '../components/DropdownOption';
import GhostSvg from '../../../../assets/img/ghost-straight-face.svg';
import ChevronDownSvgLight from '../../../../assets/img/chevron-down-lightmode.svg';
import ChevronDownSvgDark from '../../../../assets/img/chevron-down-darkmode.svg';
import {
  BitpaySupportedEvmCoins,
  getBaseEVMAccountCreationCoinsAndTokens,
} from '../../../constants/currencies';
import {BitpaySupportedTokenOptsByAddress} from '../../../constants/tokens';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {BWCErrorMessage} from '../../../constants/BWCError';
import ArchaxFooter from '../../../components/archax/archax-footer';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

export const KeyToggle = styled(TouchableOpacity)`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  gap: 5px;
`;

export const KeyDropdown = styled.SafeAreaView`
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  max-height: 75%;
`;

export const KeyDropdownOptionsContainer = styled.ScrollView`
  padding: 0 ${ScreenGutter};
`;

export const CogIconContainer = styled(TouchableOpacity)`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 50px;
  justify-content: center;
  align-items: center;
  height: 40px;
  width: 40px;
`;

const OverviewContainer = styled.SafeAreaView`
  flex: 1;
`;

const BalanceContainer = styled.View`
  height: 15%;
  margin-top: 20px;
  padding: 10px 15px;
  align-items: center;
`;

const WalletListHeader = styled.View`
  padding: 10px;
  margin-top: 10px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const WalletListFooterContainer = styled.View`
  padding: 10px 10px 100px 10px;
  margin-top: 15px;
`;

const WalletListFooter = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
`;

const WalletListFooterText = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  letter-spacing: 0;
  margin-left: 10px;
`;

const HeaderTitleContainer = styled.View`
  flex-direction: row;
  align-items: center;
`;

const HeaderRightContainer = styled(_HeaderRightContainer)`
  flex-direction: row;
  align-items: center;
`;

const KeyOverview = () => {
  const {t} = useTranslation();
  const {
    params: {id, context},
  } = useRoute<RouteProp<WalletGroupParamList, 'KeyOverview'>>();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const theme = useTheme();
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const [showKeyOptions, setShowKeyOptions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const {keys} = useAppSelector(({WALLET}) => WALLET);
  const {rates} = useAppSelector(({RATE}) => RATE);
  const {defaultAltCurrency, hideAllBalances} = useAppSelector(({APP}) => APP);
  const linkedCoinbase = useAppSelector(
    ({COINBASE}) => !!COINBASE.token[COINBASE_ENV],
  );
  const [showKeyDropdown, setShowKeyDropdown] = useState(false);
  const key = keys[id];
  const hasMultipleKeys =
    Object.values(keys).filter(k => k.backupComplete).length > 1;
  let pendingTxps: any = [];
  each(key?.wallets, x => {
    if (x.pendingTxps) {
      pendingTxps = pendingTxps.concat(x.pendingTxps);
    }
  });
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [searchVal, setSearchVal] = useState('');
  const [isViewUpdating, setIsViewUpdating] = useState(false);
  const [searchResults, setSearchResults] = useState([] as AccountRowProps[]);
  const selectedChainFilterOption = useAppSelector(
    ({APP}) => APP.selectedChainFilterOption,
  );
  useLayoutEffect(() => {
    if (!key) {
      return;
    }
    const missingChainsAccounts = memorizedAccountList.filter(
      ({chains}) =>
        IsVMChain(chains[0]) &&
        chains.length !== Object.keys(BitpaySupportedEvmCoins).length,
    );

    navigation.setOptions({
      headerTitle: () => {
        return (
          <KeyToggle
            activeOpacity={ActiveOpacity}
            disabled={!hasMultipleKeys && !linkedCoinbase}
            onPress={() => setShowKeyDropdown(true)}>
            {checkPrivateKeyEncrypted(key) ? (
              theme.dark ? (
                <EncryptPasswordDarkModeImg />
              ) : (
                <EncryptPasswordImg />
              )
            ) : null}
            <HeaderTitleContainer>
              <HeaderTitle style={{textAlign: 'center'}}>
                {key?.keyName}
              </HeaderTitle>
            </HeaderTitleContainer>
            {(hasMultipleKeys || linkedCoinbase) && (
              <ChevronContainer>
                {!theme.dark ? (
                  <ChevronDownSvgLight width={8} height={8} />
                ) : (
                  <ChevronDownSvgDark width={8} height={8} />
                )}
              </ChevronContainer>
            )}
          </KeyToggle>
        );
      },
      headerRight: () => {
        return (
          <>
            <HeaderRightContainer>
              {pendingTxps.length ? (
                <ProposalBadgeContainer
                  touchableLibrary={'react-native-gesture-handler'}
                  style={{marginRight: 10}}
                  onPress={onPressTxpBadge}>
                  <ProposalBadge>{pendingTxps.length}</ProposalBadge>
                </ProposalBadgeContainer>
              ) : null}
              {checkPrivateKeyEncrypted(key) &&
              missingChainsAccounts.length === 0 ? (
                <CogIconContainer
                  onPress={async () => {
                    await sleep(500);
                    navigation.navigate('KeySettings', {
                      key,
                    });
                  }}
                  activeOpacity={ActiveOpacity}>
                  <Icons.Cog />
                </CogIconContainer>
              ) : (
                <>
                  <Settings
                    onPress={() => {
                      setShowKeyOptions(true);
                    }}
                  />
                </>
              )}
            </HeaderRightContainer>
          </>
        );
      },
    });
  }, [navigation, key, hasMultipleKeys, theme.dark]);

  useEffect(() => {
    if (context === 'createNewMultisigKey') {
      key?.wallets[0].getStatus(
        {network: key?.wallets[0].network},
        (err: any, status: Status) => {
          if (err) {
            const errStr =
              err instanceof Error ? err.message : JSON.stringify(err);
            logger.error(`error [getStatus]: ${errStr}`);
          } else {
            navigation.navigate('Copayers', {
              wallet: key?.wallets[0],
              status: status?.wallet,
            });
          }
        },
      );
    }
  }, [navigation, key?.wallets, context]);

  useEffect(() => {
    dispatch(Analytics.track('View Key'));
    updateStatusForKey(false);
  }, []);

  const {wallets = [], totalBalance} =
    useAppSelector(({WALLET}) => WALLET.keys[id]) || {};

  const memorizedAccountList = useMemo(() => {
    return buildAccountList(key, defaultAltCurrency.isoCode, rates, dispatch, {
      filterByHideWallet: true,
    });
  }, [dispatch, key, defaultAltCurrency.isoCode, rates, hideAllBalances]);

  const _tokenOptionsByAddress = useAppSelector(({WALLET}: RootState) => {
    return {
      ...BitpaySupportedTokenOptsByAddress,
      ...WALLET.tokenOptionsByAddress,
      ...WALLET.customTokenOptionsByAddress,
    };
  });

  const startSyncWallets = async (mnemonic: string) => {
    if (key.isPrivKeyEncrypted) {
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

      if (_syncKey.fingerPrint === key.properties!.fingerPrint) {
        // Filter for new wallets
        _syncWallets = _syncWallets
          .filter(
            sw =>
              sw.isComplete() &&
              !key.wallets.some(ew => ew.id === sw.credentials.walletId),
          )
          .map(syncWallet => {
            // update to keyId
            syncWallet.credentials.keyId = key.properties!.id;
            const {currencyAbbreviation, currencyName} = dispatch(
              mapAbbreviationAndName(
                syncWallet.credentials.coin,
                syncWallet.credentials.chain,
                syncWallet.credentials.token?.address,
              ),
            );
            return _.merge(
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
          dispatch(syncWallets({keyId: key.id, wallets: _syncWallets}));
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

  const handleAddEvmChain = async () => {
    haptic('impactLight');
    await sleep(500);

    let password;
    if (key.isPrivKeyEncrypted) {
      password = await dispatch(getDecryptPassword(Object.assign({}, key)));
    }

    const evmWallets = getEvmGasWallets(key.wallets);
    const accountsArray = [
      ...new Set(evmWallets.map(wallet => wallet.credentials.account)),
    ];

    const wallets = await createWalletsForAccounts(
      dispatch,
      accountsArray,
      key.methods as KeyMethods,
      getBaseEVMAccountCreationCoinsAndTokens(),
      password,
    );

    if (_.isEmpty(wallets)) {
      if (!key.isPrivKeyEncrypted) {
        await startSyncWallets(key.properties!.mnemonic);
      } else {
        const mnemonic = key.methods!.get(password).mnemonic;
        await startSyncWallets(mnemonic);
      }
    } else {
      key.wallets.push(...(wallets as Wallet[]));
      dispatch(successAddWallet({key}));
    }
  };

  const missingChainsAccounts = memorizedAccountList.filter(
    ({chains}) =>
      IsEVMChain(chains[0]) &&
      chains.length !== Object.keys(BitpaySupportedEvmCoins).length,
  );
  const keyOptions: Array<Option> = [];

  keyOptions.push({
    img: <Icons.Wallet width="15" height="15" />,
    title: t('Add Wallet'),
    description: t(
      'Choose another currency you would like to add to your key.',
    ),
    onPress: async () => {
      haptic('impactLight');
      await sleep(500);
      navigation.navigate('AddingOptions', {
        key,
      });
    },
  });

  if (missingChainsAccounts.length > 0) {
    keyOptions.push({
      img: <Icons.Wallet width="15" height="15" />,
      title: t('Add Ethereum networks'),
      description: t('Add all supported networks for this key.'),
      onPress: async () => {
        await handleAddEvmChain();
      },
    });
  }

  if (!key?.isReadOnly && !checkPrivateKeyEncrypted(key)) {
    keyOptions.push({
      img: <Icons.Encrypt />,
      title: t('Encrypt your Key'),
      description: t(
        'Prevent an unauthorized user from sending funds out of your wallet.',
      ),
      onPress: async () => {
        haptic('impactLight');
        await sleep(500);
        navigation.navigate('CreateEncryptPassword', {
          key,
        });
      },
    });
  }

  keyOptions.push({
    img: <Icons.Settings />,
    title: t('Key Settings'),
    description: t('View all the ways to manage and configure your key.'),
    onPress: async () => {
      haptic('impactLight');
      await sleep(500);
      navigation.navigate('KeySettings', {
        key,
      });
    },
  });

  const onPressTxpBadge = useMemo(
    () => () => {
      navigation.navigate('TransactionProposalNotifications', {keyId: key.id});
    },
    [],
  );

  const updateStatusForKey = async (forceUpdate?: boolean) => {
    if (isViewUpdating) {
      logger.debug('KeyOverview is updating. Do not start forced updateAll...');
      return;
    }

    try {
      setIsViewUpdating(true);
      await dispatch(startGetRates({}));
      await Promise.all([
        dispatch(
          startUpdateAllWalletStatusForKey({
            key,
            force: forceUpdate,
            createTokenWalletWithFunds: forceUpdate,
          }),
        ),
        sleep(1000),
      ]);
      dispatch(updatePortfolioBalance());
      setIsViewUpdating(false);
    } catch (err) {
      setIsViewUpdating(false);
      dispatch(showBottomNotificationModal(BalanceUpdateError()));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await updateStatusForKey(true);
    setRefreshing(false);
  };

  const onPressItem = (item: AccountRowProps) => {
    haptic('impactLight');

    if (IsVMChain(item.chains[0])) {
      navigation.navigate('AccountDetails', {
        keyId: item.keyId,
        selectedAccountAddress: item.receiveAddress,
        isSvmAccount: IsSVMChain(item.chains[0]),
      });
      return;
    }
    const fullWalletObj = key.wallets.find(
      k =>
        k.id === item.wallets[0].id &&
        (!item.copayerId || k.credentials?.copayerId === item.copayerId),
    )!;
    if (!fullWalletObj.isComplete()) {
      fullWalletObj.getStatus(
        {network: fullWalletObj.network},
        (err: any, status: Status) => {
          if (err) {
            const errStr =
              err instanceof Error ? err.message : JSON.stringify(err);
            logger.error(`error [getStatus]: ${errStr}`);
          } else {
            if (status?.wallet?.status === 'complete') {
              fullWalletObj.openWallet({}, () => {
                navigation.navigate('WalletDetails', {
                  walletId: fullWalletObj.credentials.walletId,
                  key,
                  copayerId: item.copayerId,
                });
              });
              return;
            }
            navigation.navigate('Copayers', {
              wallet: fullWalletObj,
              status: status?.wallet,
            });
          }
        },
      );
    } else {
      navigation.navigate('WalletDetails', {
        key,
        walletId: fullWalletObj.credentials.walletId,
        copayerId: fullWalletObj.credentials.copayerId,
      });
    }
  };

  const memoizedRenderItem = useCallback(
    ({item}: {item: AccountRowProps}) => {
      return (
        <AccountListRow
          id={item.id}
          accountItem={item}
          hideBalance={hideAllBalances}
          onPress={() => onPressItem(item)}
        />
      );
    },
    [key, hideAllBalances],
  );

  const renderListHeaderComponent = useCallback(() => {
    return (
      <WalletListHeader>
        <H5>{t('My Wallets')}</H5>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginRight: -10,
          }}>
          <SearchComponent<AccountRowProps>
            searchVal={searchVal}
            setSearchVal={setSearchVal}
            searchResults={searchResults}
            setSearchResults={searchResults => {
              setSearchResults(searchResults);
              setIsLoadingInitial(false);
            }}
            searchFullList={memorizedAccountList}
            context={'keyoverview'}
          />
        </View>
      </WalletListHeader>
    );
  }, [key, hideAllBalances]);

  const renderListFooterComponent = useCallback(() => {
    return (
      <WalletListFooterContainer>
        <WalletListFooter
          activeOpacity={ActiveOpacity}
          onPress={async () => {
            haptic('impactLight');
            navigation.navigate('AddingOptions', {
              key,
            });
          }}>
          <Icons.Add />
          <WalletListFooterText>{t('Add Wallet')}</WalletListFooterText>
        </WalletListFooter>
        {showArchaxBanner && <ArchaxFooter />}
      </WalletListFooterContainer>
    );
  }, []);

  const listEmptyComponent = useMemo(
    () =>
      !isLoadingInitial ? (
        <EmptyListContainer>
          <H5>{t("It's a ghost town in here")}</H5>
          <GhostSvg style={{marginTop: 20}} />
        </EmptyListContainer>
      ) : null,
    [t, isLoadingInitial],
  );

  const renderDataComponent = useMemo(() => {
    return !searchVal && !selectedChainFilterOption
      ? memorizedAccountList
      : searchResults;
  }, [searchResults, selectedChainFilterOption, key]);

  return (
    <OverviewContainer>
      <BalanceContainer>
        <TouchableOpacity
          onLongPress={() => {
            dispatch(toggleHideAllBalances());
          }}>
          {!hideAllBalances ? (
            <Balance scale={shouldScale(totalBalance)}>
              {formatFiatAmount(totalBalance, defaultAltCurrency.isoCode, {
                currencyDisplay: 'symbol',
              })}
            </Balance>
          ) : (
            <H2>****</H2>
          )}
        </TouchableOpacity>
      </BalanceContainer>

      <FlashList<AccountRowProps>
        refreshControl={
          <RefreshControl
            tintColor={theme.dark ? White : SlateDark}
            refreshing={refreshing}
            onRefresh={() => onRefresh()}
          />
        }
        ListHeaderComponent={renderListHeaderComponent}
        ListFooterComponent={renderListFooterComponent}
        data={renderDataComponent}
        renderItem={memoizedRenderItem}
        ListEmptyComponent={listEmptyComponent}
        estimatedItemSize={70}
      />

      {keyOptions.length > 0 ? (
        <OptionsSheet
          isVisible={showKeyOptions}
          title={t('Key Options')}
          options={keyOptions}
          closeModal={() => setShowKeyOptions(false)}
        />
      ) : null}

      <SheetModal
        isVisible={showKeyDropdown}
        placement={'top'}
        onBackdropPress={() => setShowKeyDropdown(false)}>
        <KeyDropdown>
          <HeaderTitle style={{margin: 15}}>{t('Other Keys')}</HeaderTitle>
          <KeyDropdownOptionsContainer>
            {Object.values(keys)
              .filter(_key => _key.backupComplete && _key.id !== id)
              .map(_key => (
                <DropdownOption
                  key={_key.id}
                  optionId={_key.id}
                  optionName={_key.keyName}
                  wallets={_key.wallets}
                  totalBalance={_key.totalBalance}
                  onPress={keyId => {
                    setShowKeyDropdown(false);
                    navigation.setParams({
                      id: keyId,
                    } as any);
                  }}
                  defaultAltCurrencyIsoCode={defaultAltCurrency.isoCode}
                  hideKeyBalance={hideAllBalances}
                />
              ))}
            {linkedCoinbase ? (
              <CoinbaseDropdownOption
                onPress={() => {
                  setShowKeyDropdown(false);
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 1,
                      routes: [
                        {
                          name: RootStacks.TABS,
                          params: {screen: TabsScreens.HOME},
                        },
                        {
                          name: CoinbaseScreens.ROOT,
                          params: {},
                        },
                      ],
                    }),
                  );
                }}
              />
            ) : null}
          </KeyDropdownOptionsContainer>
        </KeyDropdown>
      </SheetModal>
    </OverviewContainer>
  );
};

export default KeyOverview;
