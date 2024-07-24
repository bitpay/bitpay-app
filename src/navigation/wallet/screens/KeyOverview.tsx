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
import {FlatList, LogBox, RefreshControl, TouchableOpacity} from 'react-native';
import styled from 'styled-components/native';
import haptic from '../../../components/haptic-feedback/haptic';
import WalletRow, {WalletRowProps} from '../../../components/list/WalletRow';
import {
  BaseText,
  H2,
  H5,
  HeaderTitle,
  ProposalBadge,
} from '../../../components/styled/Text';
import Settings from '../../../components/settings/Settings';
import {
  Hr,
  ActiveOpacity,
  ScreenGutter,
  HeaderRightContainer as _HeaderRightContainer,
  ProposalBadgeContainer,
} from '../../../components/styled/Containers';
import {
  showBottomNotificationModal,
  toggleHideAllBalances,
} from '../../../store/app/app.actions';
import {startUpdateAllWalletStatusForKey} from '../../../store/wallet/effects/status/status';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {Wallet, Status} from '../../../store/wallet/wallet.models';
import {Rates} from '../../../store/rate/rate.models';
import {
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../styles/colors';
import {
  convertToFiat,
  formatCurrencyAbbreviation,
  formatFiatAmount,
  shouldScale,
  sleep,
} from '../../../utils/helper-methods';
import {BalanceUpdateError} from '../components/ErrorMessages';
import OptionsSheet, {Option} from '../components/OptionsSheet';
import Icons from '../components/WalletIcons';
import {WalletGroupParamList} from '../WalletGroup';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import {
  AppDispatch,
  useAppDispatch,
  useAppSelector,
  useLogger,
} from '../../../utils/hooks';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {startGetRates} from '../../../store/wallet/effects';
import EncryptPasswordImg from '../../../../assets/img/tinyicon-encrypt.svg';
import EncryptPasswordDarkModeImg from '../../../../assets/img/tinyicon-encrypt-darkmode.svg';
import {useTranslation} from 'react-i18next';
import {toFiat} from '../../../store/wallet/utils/wallet';
import {each} from 'lodash';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import CoinbaseDropdownOption from '../components/CoinbaseDropdownOption';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../../navigation/tabs/TabsStack';
import {CoinbaseScreens} from '../../../navigation/coinbase/CoinbaseGroup';
import SearchComponent from '../../../components/chain-search/ChainSearch';
import {IsEVMCoin} from '../../../store/wallet/utils/currency';
import {Network} from '../../../constants';
import AccountListRow, {
  AccountRowProps,
} from '../../../components/list/AccountListRow';
import _ from 'lodash';
import DropdownOption from '../components/DropdownOption';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const Row = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: flex-end;
`;

const OverviewContainer = styled.SafeAreaView`
  flex: 1;
`;

export const BalanceContainer = styled.View`
  height: 15%;
  margin-top: 20px;
  padding: 10px 15px;
`;

export const Balance = styled(BaseText)<{scale: boolean}>`
  font-size: ${({scale}) => (scale ? 25 : 35)}px;
  font-style: normal;
  font-weight: 700;
  line-height: 53px;
  letter-spacing: 0;
  text-align: center;
`;

const WalletListHeader = styled.View`
  padding: 10px;
  margin-top: 10px;
`;

const WalletListFooterContainer = styled.View`
  padding: 10px 10px 100px 10px;
  margin-top: 15px;
`;

const WalletListFooter = styled.TouchableOpacity`
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

export const KeyToggle = styled(TouchableOpacity)`
  align-items: center;
  flex-direction: column;
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

export const CogIconContainer = styled.TouchableOpacity`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 50px;
  justify-content: center;
  align-items: center;
  height: 40px;
  width: 40px;
`;

const HeaderTitleContainer = styled.View`
  flex-direction: row;
  align-items: center;
`;

const HeaderRightContainer = styled(_HeaderRightContainer)`
  flex-direction: row;
  align-items: center;
`;

const SearchComponentContainer = styled.View`
  padding-right: 15px;
  padding-left: 15px;
  margin-top: 16px;
`;

type getFiatOptions = {
  dispatch: AppDispatch;
  satAmount: number;
  defaultAltCurrencyIsoCode: string;
  currencyAbbreviation: string;
  chain: string;
  rates: Rates;
  tokenAddress: string | undefined;
  hideWallet: boolean | undefined;
  network: Network;
  currencyDisplay?: 'symbol' | 'code';
};

type FormatFiatOptions = {
  fiatAmount: number;
  defaultAltCurrencyIsoCode: string;
  currencyDisplay?: 'symbol' | 'code';
};

export const getFiat = ({
  dispatch,
  satAmount,
  defaultAltCurrencyIsoCode,
  currencyAbbreviation,
  chain,
  rates,
  tokenAddress,
  hideWallet,
  network,
}: getFiatOptions) =>
  convertToFiat(
    dispatch(
      toFiat(
        satAmount,
        defaultAltCurrencyIsoCode,
        currencyAbbreviation,
        chain,
        rates,
        tokenAddress,
      ),
    ),
    hideWallet,
    network,
  );

export const formatFiat = ({
  fiatAmount,
  defaultAltCurrencyIsoCode,
  currencyDisplay,
}: FormatFiatOptions) =>
  formatFiatAmount(fiatAmount, defaultAltCurrencyIsoCode, {currencyDisplay});

const buildAccountBalance = (
  defaultAltCurrencyIsoCode: string,
  accountList: Partial<AccountRowProps>[],
  currencyDisplay?: 'symbol',
) => {
  accountList.forEach(account => {
    const accumulatedBalances = account?.wallets?.reduce(
      (acc: Partial<AccountRowProps>, wallet: WalletRowProps) => {
        const {
          fiatBalance,
          fiatLockedBalance,
          fiatConfirmedLockedBalance,
          fiatSpendableBalance,
          fiatPendingBalance,
        } = wallet;
        const formattedBalances = {
          fiatBalance: (acc?.fiatBalance ?? 0) + fiatBalance,
          fiatLockedBalance: (acc?.fiatLockedBalance ?? 0) + fiatLockedBalance,
          fiatConfirmedLockedBalance:
            (acc?.fiatConfirmedLockedBalance ?? 0) + fiatConfirmedLockedBalance,
          fiatSpendableBalance:
            (acc?.fiatSpendableBalance ?? 0) + fiatSpendableBalance,
          fiatPendingBalance:
            (acc?.fiatPendingBalance ?? 0) + fiatPendingBalance,
        };
        return formattedBalances;
      },
      {},
    );
    Object.assign(account, accumulatedBalances);
    account.fiatBalanceFormat = formatFiat({
      fiatAmount: account?.fiatBalance ?? 0,
      defaultAltCurrencyIsoCode,
      currencyDisplay,
    });
    account.fiatLockedBalanceFormat = formatFiat({
      fiatAmount: account?.fiatLockedBalance ?? 0,
      defaultAltCurrencyIsoCode,
      currencyDisplay,
    });
    account.fiatConfirmedLockedBalanceFormat = formatFiat({
      fiatAmount: account?.fiatConfirmedLockedBalance ?? 0,
      defaultAltCurrencyIsoCode,
      currencyDisplay,
    });
    account.fiatSpendableBalanceFormat = formatFiat({
      fiatAmount: account?.fiatSpendableBalance ?? 0,
      defaultAltCurrencyIsoCode,
      currencyDisplay,
    });
    account.fiatPendingBalanceFormat = formatFiat({
      fiatAmount: account?.fiatPendingBalance ?? 0,
      defaultAltCurrencyIsoCode,
      currencyDisplay,
    });
  });
  return accountList as AccountRowProps[];
};

export const buildUIFormattedAccount: (
  accountList: Partial<AccountRowProps>[],
  wallet: Wallet,
  defaultAltCurrencyIsoCode: string,
  rates: Rates,
  dispatch: AppDispatch,
) => void = (
  accountList,
  wallet,
  defaultAltCurrencyIsoCode,
  rates,
  dispatch,
) => {
  const uiFormattedWallet = buildUIFormattedWallet(
    wallet,
    defaultAltCurrencyIsoCode,
    rates,
    dispatch,
  ) as WalletRowProps;

  let walletsAccount = accountList.find(
    ({receiveAddress}) => receiveAddress === wallet.receiveAddress,
  ) as AccountRowProps | undefined;

  const newAccount: Partial<AccountRowProps> = {
    id: _.uniqueId('account_'),
    keyId: wallet.keyId,
    accountName: IsEVMCoin(wallet.chain)
      ? `EVM Account ${wallet.credentials.account}`
      : wallet.walletName || wallet.credentials.walletName,
    wallets: walletsAccount
      ? [...walletsAccount.wallets, uiFormattedWallet]
      : [uiFormattedWallet],
    accountNumber: wallet.credentials.account,
    receiveAddress: wallet.receiveAddress,
    isMultiNetworkSupported: IsEVMCoin(wallet.chain) ? true : false,
    fiatBalance: uiFormattedWallet.fiatBalance,
    fiatLockedBalance: uiFormattedWallet.fiatLockedBalance,
    fiatConfirmedLockedBalance: uiFormattedWallet.fiatConfirmedLockedBalance,
    fiatSpendableBalance: uiFormattedWallet.fiatSpendableBalance,
    fiatPendingBalance: uiFormattedWallet.fiatPendingBalance,
  };

  if (walletsAccount) {
    const index = accountList.findIndex(
      ({receiveAddress}) => receiveAddress === wallet.receiveAddress,
    );
    accountList[index] = newAccount;
  } else {
    accountList.push(newAccount);
  }
};

export const buildUIFormattedWallet: (
  wallet: Wallet,
  defaultAltCurrencyIsoCode: string,
  rates: Rates,
  dispatch: AppDispatch,
  currencyDisplay?: 'symbol',
) => WalletRowProps = (
  wallet,
  defaultAltCurrencyIsoCode,
  rates,
  dispatch,
  currencyDisplay,
) => {
  const {
    id,
    img,
    badgeImg,
    currencyName,
    chainName,
    currencyAbbreviation,
    chain,
    tokenAddress,
    network,
    walletName,
    balance,
    credentials,
    keyId,
    isRefreshing,
    isScanning,
    hideWallet,
    hideBalance,
    pendingTxps,
    receiveAddress,
  } = wallet;

  const opts: Omit<getFiatOptions, 'satAmount'> = {
    dispatch,
    defaultAltCurrencyIsoCode,
    currencyAbbreviation,
    chain,
    rates,
    tokenAddress,
    hideWallet,
    network,
    currencyDisplay,
  };

  const fiatBalance = getFiat({...opts, satAmount: balance.sat});
  const fiatLockedBalance = getFiat({...opts, satAmount: balance.satLocked});
  const fiatConfirmedLockedBalance = getFiat({
    ...opts,
    satAmount: balance.satConfirmedLocked,
  });
  const fiatSpendableBalance = getFiat({
    ...opts,
    satAmount: balance.satSpendable,
  });
  const fiatPendingBalance = getFiat({...opts, satAmount: balance.satPending});

  return {
    id,
    keyId,
    img,
    badgeImg,
    currencyName,
    chainName,
    currencyAbbreviation: formatCurrencyAbbreviation(currencyAbbreviation),
    chain,
    walletName: walletName || credentials.walletName,
    cryptoBalance: balance.crypto,
    cryptoLockedBalance: balance.cryptoLocked,
    cryptoConfirmedLockedBalance: balance.cryptoConfirmedLocked,
    cryptoSpendableBalance: balance.cryptoSpendable,
    cryptoPendingBalance: balance.cryptoPending,
    fiatBalance,
    fiatLockedBalance,
    fiatConfirmedLockedBalance,
    fiatSpendableBalance,
    fiatPendingBalance,
    fiatBalanceFormat: formatFiat({
      fiatAmount: fiatBalance,
      defaultAltCurrencyIsoCode,
      currencyDisplay,
    }),
    fiatLockedBalanceFormat: formatFiat({
      fiatAmount: fiatLockedBalance,
      defaultAltCurrencyIsoCode,
      currencyDisplay,
    }),
    fiatConfirmedLockedBalanceFormat: formatFiat({
      fiatAmount: fiatConfirmedLockedBalance,
      defaultAltCurrencyIsoCode,
      currencyDisplay,
    }),
    fiatSpendableBalanceFormat: formatFiat({
      fiatAmount: fiatSpendableBalance,
      defaultAltCurrencyIsoCode,
      currencyDisplay,
    }),
    fiatPendingBalanceFormat: formatFiat({
      fiatAmount: fiatPendingBalance,
      defaultAltCurrencyIsoCode,
      currencyDisplay,
    }),
    network: network,
    isRefreshing,
    isScanning,
    hideWallet,
    hideBalance,
    pendingTxps,
    multisig:
      credentials.n > 1
        ? `- Multisig ${credentials.m}/${credentials.n}`
        : undefined,
    isComplete: credentials.isComplete(),
    receiveAddress,
    account: credentials.account,
  };
};

// Key overview list builder
export const buildAccountList = (
  coins: Wallet[],
  defaultAltCurrencyIso: string,
  rates: Rates,
  dispatch: AppDispatch,
) => {
  const accountList: Array<Partial<AccountRowProps>> = [];
  coins.forEach(coin => {
    buildUIFormattedAccount(
      accountList,
      coin,
      defaultAltCurrencyIso,
      rates,
      dispatch,
    );
  });
  const accountListWithBalances = buildAccountBalance(
    defaultAltCurrencyIso,
    accountList,
    'symbol',
  );
  return accountListWithBalances;
};

const KeyOverview = () => {
  const {t} = useTranslation();
  const {
    params: {id, context},
  } = useRoute<RouteProp<WalletGroupParamList, 'KeyOverview'>>();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const theme = useTheme();
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
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState([] as AccountRowProps[]);
  const selectedChainFilterOption = useAppSelector(
    ({APP}) => APP.selectedChainFilterOption,
  );
  useLayoutEffect(() => {
    if (!key) {
      return;
    }

    navigation.setOptions({
      headerTitle: () => {
        return (
          <KeyToggle
            activeOpacity={ActiveOpacity}
            disabled={!hasMultipleKeys && !linkedCoinbase}
            onPress={() => setShowKeyDropdown(true)}>
            {key.methods?.isPrivKeyEncrypted() ? (
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
              {(hasMultipleKeys || linkedCoinbase) && (
                <ChevronDownSvg style={{marginLeft: 10}} />
              )}
            </HeaderTitleContainer>
          </KeyToggle>
        );
      },
      headerRight: () => {
        return (
          <>
            <HeaderRightContainer>
              {pendingTxps.length ? (
                <ProposalBadgeContainer
                  style={{marginRight: 10}}
                  onPress={onPressTxpBadge}>
                  <ProposalBadge>{pendingTxps.length}</ProposalBadge>
                </ProposalBadgeContainer>
              ) : null}
              {key?.methods?.isPrivKeyEncrypted() ? (
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
  }, []);

  const {wallets = [], totalBalance} =
    useAppSelector(({WALLET}) => WALLET.keys[id]) || {};

  const memorizedAccountList = useMemo(() => {
    const coins = wallets.filter(wallet => !wallet.hideWallet);
    return buildAccountList(coins, defaultAltCurrency.isoCode, rates, dispatch);
  }, [dispatch, wallets, defaultAltCurrency.isoCode, rates]);

  const keyOptions: Array<Option> = [];

  if (!key?.methods?.isPrivKeyEncrypted()) {
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

    if (!key?.isReadOnly) {
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
  }

  const onPressTxpBadge = useMemo(
    () => () => {
      navigation.navigate('TransactionProposalNotifications', {keyId: key.id});
    },
    [],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(startGetRates({}));
      await Promise.all([
        dispatch(startUpdateAllWalletStatusForKey({key, force: true})),
        sleep(1000),
      ]);
      dispatch(updatePortfolioBalance());
    } catch (err) {
      dispatch(showBottomNotificationModal(BalanceUpdateError()));
    }
    setRefreshing(false);
  };

  const memoizedRenderItem = useCallback(
    ({item}: {item: AccountRowProps}) => {
      return (
        <AccountListRow
          id={item.id}
          accountItem={item}
          hideBalance={hideAllBalances}
          onPress={() => {
            haptic('impactLight');

            if (item.wallets.length > 0) {
              navigation.navigate('AccountDetails', {
                key,
                accountItem: item,
                accountList: memorizedAccountList,
              });
              return;
            }
            const fullWalletObj = key.wallets.find(k => k.id === item.id)!;
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
                          walletId: item.id,
                          key,
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
                walletId: item.id,
              });
            }
          }}
        />
      );
    },
    [key, hideAllBalances],
  );

  return (
    <OverviewContainer>
      <BalanceContainer>
        <TouchableOpacity
          onLongPress={() => {
            dispatch(toggleHideAllBalances());
          }}>
          <Row>
            {!hideAllBalances ? (
              <Balance scale={shouldScale(totalBalance)}>
                {formatFiatAmount(totalBalance, defaultAltCurrency.isoCode, {
                  currencyDisplay: 'symbol',
                })}
              </Balance>
            ) : (
              <H2>****</H2>
            )}
          </Row>
        </TouchableOpacity>
      </BalanceContainer>

      <Hr />

      <SearchComponentContainer>
        <SearchComponent<AccountRowProps>
          searchVal={searchVal}
          setSearchVal={setSearchVal}
          searchResults={searchResults}
          setSearchResults={setSearchResults}
          searchFullList={memorizedAccountList}
          context={'keyoverview'}
        />
      </SearchComponentContainer>

      <FlatList<AccountRowProps>
        refreshControl={
          <RefreshControl
            tintColor={theme.dark ? White : SlateDark}
            refreshing={refreshing}
            onRefresh={() => onRefresh()}
          />
        }
        ListHeaderComponent={() => {
          return (
            <WalletListHeader>
              <H5>{t('My Wallets')}</H5>
            </WalletListHeader>
          );
        }}
        ListFooterComponent={() => {
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
            </WalletListFooterContainer>
          );
        }}
        data={
          !searchVal && !selectedChainFilterOption
            ? memorizedAccountList
            : searchResults
        }
        renderItem={memoizedRenderItem}
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
