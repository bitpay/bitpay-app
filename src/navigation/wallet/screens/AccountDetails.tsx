import {CommonActions, useNavigation, useTheme} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import _ from 'lodash';
import React, {
  ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {RootState} from '../../../store';
import {useTranslation} from 'react-i18next';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  Wallet,
  TransactionProposal,
  Status,
  KeyMethods,
} from '../../../store/wallet/wallet.models';
import styled from 'styled-components/native';
import {
  KeyToggle as AccountToogle,
  KeyDropdown as AccountDropdown,
  KeyDropdownOptionsContainer as AccountDropdownOptionsContainer,
} from './KeyOverview';
import {
  DeviceEventEmitter,
  RefreshControl,
  SectionList,
  View,
} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {
  Badge,
  Balance,
  BaseText,
  H2,
  H5,
  HeaderTitle,
  Link,
  ProposalBadge,
} from '../../../components/styled/Text';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
  toggleHideAllBalances,
} from '../../../store/app/app.actions';
import {
  formatCryptoAddress,
  formatCurrencyAbbreviation,
  shouldScale,
  sleep,
  fixWalletAddresses,
} from '../../../utils/helper-methods';
import LinkingButtons from '../../tabs/home/components/LinkingButtons';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {Air, LightBlack, SlateDark, White} from '../../../styles/colors';
import {
  createMultipleWallets,
  getDecryptPassword,
  startGetRates,
  serverAssistedImport,
  normalizeMnemonic,
} from '../../../store/wallet/effects';
import {startUpdateAllWalletStatusForKey} from '../../../store/wallet/effects/status/status';
import {
  successAddWallet,
  updatePortfolioBalance,
  syncWallets,
} from '../../../store/wallet/wallet.actions';
import {
  BalanceUpdateError,
  CustomErrorMessage,
  RbfTransaction,
  SpeedupEthTransaction,
  SpeedupInsufficientFunds,
  SpeedupInvalidTx,
  SpeedupTransaction,
  UnconfirmedInputs,
} from '../components/ErrorMessages';
import {WalletRowProps} from '../../../components/list/WalletRow';
import AssetsByChainRow from '../../../components/list/AssetsByChainRow';
import {
  ActiveOpacity,
  BadgeContainerTouchable,
  ChevronContainer,
  EmptyListContainer,
  HeaderRightContainer,
  ProposalBadgeContainer,
  ScreenGutter,
} from '../../../components/styled/Containers';
import SearchComponent, {
  SearchableItem,
} from '../../../components/chain-search/ChainSearch';
import CopySvg from '../../../../assets/img/copy.svg';
import SentBadgeSvg from '../../../../assets/img/sent-badge.svg';
import CopiedSvg from '../../../../assets/img/copied-success.svg';
import Icons from '../components/WalletIcons';
import EncryptPasswordDarkModeImg from '../../../../assets/img/tinyicon-encrypt-darkmode.svg';
import EncryptPasswordImg from '../../../../assets/img/tinyicon-encrypt.svg';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import haptic from '../../../components/haptic-feedback/haptic';
import Clipboard from '@react-native-clipboard/clipboard';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import CoinbaseDropdownOption from '../components/CoinbaseDropdownOption';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../tabs/TabsStack';
import {CoinbaseScreens} from '../../coinbase/CoinbaseGroup';
import DropdownOption from '../components/DropdownOption';
import TransactionRow, {
  TRANSACTION_ROW_HEIGHT,
} from '../../../components/list/TransactionRow';
import ContactIcon from '../../tabs/contacts/components/ContactIcon';
import {
  TRANSACTION_ICON_SIZE,
  TransactionIcons,
} from '../../../constants/TransactionIcons';
import TransactionProposalRow from '../../../components/list/TransactionProposalRow';
import {getGiftCardIcons} from '../../../lib/gift-cards/gift-card';
import {BillPayAccount} from '../../../store/shop/shop.models';
import {
  BuildUiFriendlyList,
  CanSpeedupTx,
  GetAccountTransactionHistory,
  GroupTransactionHistory,
  IsMoved,
  IsReceived,
  TX_HISTORY_LIMIT,
} from '../../../store/wallet/effects/transactions/transactions';
import {
  buildBtcSpeedupTx,
  buildEthERCTokenSpeedupTx,
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
} from '../../../store/wallet/effects/send/send';
import debounce from 'lodash.debounce';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';
import GhostSvg from '../../../../assets/img/ghost-straight-face.svg';
import WalletTransactionSkeletonRow from '../../../components/list/WalletTransactionSkeletonRow';
import {
  buildAccountList,
  buildAssetsByChainList,
  findWalletById,
  buildWalletObj,
  mapAbbreviationAndName,
  checkPrivateKeyEncrypted,
} from '../../../store/wallet/utils/wallet';
import {DeviceEmitterEvents} from '../../../constants/device-emitter-events';
import ChevronDownSvgLight from '../../../../assets/img/chevron-down-lightmode.svg';
import ChevronDownSvgDark from '../../../../assets/img/chevron-down-darkmode.svg';
import KeySvg from '../../../../assets/img/key.svg';
import ReceiveAddress from '../components/ReceiveAddress';
import {IsVMChain} from '../../../store/wallet/utils/currency';
import {LogActions} from '../../../store/log/';
import uniqBy from 'lodash.uniqby';
import OptionsSheet, {Option} from '../components/OptionsSheet';
import Settings from '../../../components/settings/Settings';
import {
  BitpaySupportedEvmCoins,
  BitpaySupportedSvmCoins,
  getBaseEVMAccountCreationCoinsAndTokens,
} from '../../../constants/currencies';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {BitpaySupportedTokenOptsByAddress} from '../../../constants/tokens';

export type AccountDetailsScreenParamList = {
  selectedAccountAddress: string;
  keyId: string;
  skipInitializeHistory?: boolean;
  isSvmAccount?: boolean;
};

type AccountDetailsScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
  'AccountDetails'
>;

export interface AssetsByChainData {
  id: string;
  chain: string;
  chainName: string;
  chainImg: string | ((props?: any) => ReactElement);
  chainAssetsList: WalletRowProps[];
  accountAddress: string;
  fiatBalance: number;
  fiatLockedBalance: number;
  fiatConfirmedLockedBalance: number;
  fiatSpendableBalance: number;
  fiatPendingBalance: number;
  fiatBalanceFormat: string;
  fiatLockedBalanceFormat: string;
  fiatConfirmedLockedBalanceFormat: string;
  fiatSpendableBalanceFormat: string;
  fiatPendingBalanceFormat: string;
}

export interface AssetsByChainListProps extends SearchableItem {
  title: string;
  chains: string[]; // only used for filter
  data: AssetsByChainData[];
}

export interface GroupedHistoryProps extends SearchableItem {
  title: string;
  data: TransactionProposal[];
  time: number;
}

interface AccountProposalsProps {
  [key: string]: TransactionProposal[];
}

const BorderBottom = styled.View`
  border-bottom-width: 1px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : Air)};
`;

const AccountDetailsContainer = styled.SafeAreaView`
  flex: 1;
`;

const Row = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: flex-end;
`;

const WalletListHeader = styled(TouchableOpacity)<{
  isActive: boolean;
}>`
  padding: 10px;
  opacity: ${({isActive}) => (isActive ? 1 : 0.4)};
`;

const CopyToClipboardContainer = styled.View`
  justify-content: center;
  height: 20px;
`;

const HeaderContainer = styled.View`
  margin: 32px 0 24px;
`;

const TransactionSectionHeaderContainer = styled.View`
  padding: ${ScreenGutter};
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : '#F5F6F7')};
  height: 55px;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const SkeletonContainer = styled.View`
  margin-bottom: 20px;
`;

const LockedBalanceContainer = styled(TouchableOpacity)`
  flex-direction: row;
  padding: ${ScreenGutter};
  justify-content: center;
  align-items: center;
  height: 75px;
`;

const Description = styled(BaseText)`
  overflow: hidden;
  margin-right: 175px;
  font-size: 16px;
`;

const TailContainer = styled.View`
  margin-left: auto;
`;

const Value = styled(BaseText)`
  text-align: right;
  font-weight: 700;
  font-size: 16px;
`;

const BalanceContainer = styled.View`
  padding: 0 15px 40px;
  flex-direction: column;
`;

const AssetsDataContainer = styled(Row)`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const HeaderListContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const AddCustomTokenContainer = styled(TouchableOpacity)`
  margin: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CenteredText = styled(BaseText)`
  text-align: center;
  font-size: 12px;
  line-height: 18px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-weight: 400;
  margin-left: 4px;
`;

const AccountDetails: React.FC<AccountDetailsScreenProps> = ({route}) => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const {defaultAltCurrency, hideAllBalances} = useAppSelector(({APP}) => APP);
  const contactList = useAppSelector(({CONTACT}) => CONTACT.list);
  const {t} = useTranslation();
  const {selectedAccountAddress, keyId, isSvmAccount} = route.params;
  const [refreshing, setRefreshing] = useState(false);
  const {keys} = useAppSelector(({WALLET}) => WALLET);
  const [copied, setCopied] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [showActivityTab, setShowActivityTab] = useState(false);
  const selectedChainFilterOption = useAppSelector(
    ({APP}) => APP.selectedChainFilterOption,
  );
  const network = useAppSelector(({APP}) => APP.network);
  const [history, setHistory] = useState<any[]>([]);
  const [accountTransactionsHistory, setAccountTransactionsHistory] = useState<{
    [key: string]: {
      transactions: any[];
      loadMore: boolean;
      hasConfirmingTxs: boolean;
    };
  }>({});
  const [groupedHistory, setGroupedHistory] = useState<GroupedHistoryProps[]>(
    [],
  );
  const [loadMoreIndex, setLoadMoreIndex] = useState(1);
  const [loadMore, setLoadMore] = useState(true);
  const [isLoading, setIsLoading] = useState<boolean>();
  const [errorLoadingTxs, setErrorLoadingTxs] = useState<boolean>();
  const [needActionPendingTxps, setNeedActionPendingTxps] = useState<any[]>([]);
  const [needActionUnsentTxps, setNeedActionUnsentTxps] = useState<any[]>([]);
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const supportedCardMap = useAppSelector(
    ({SHOP_CATALOG}) => SHOP_CATALOG.supportedCardMap,
  );
  const [showReceiveAddressBottomModal, setShowReceiveAddressBottomModal] =
    useState(false);
  const {rates} = useAppSelector(({RATE}) => RATE);
  const [showKeyOptions, setShowKeyOptions] = useState(false);

  const [searchResultsHistory, setSearchResultsHistory] = useState(
    [] as GroupedHistoryProps[],
  );
  const [searchResultsAssets, setSearchResultsAssets] = useState(
    [] as AssetsByChainListProps[],
  );
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const linkedCoinbase = useAppSelector(
    ({COINBASE}) => !!COINBASE.token[COINBASE_ENV],
  );

  const key = keys[keyId];
  const keyFullWalletObjs = uniqBy(
    key.wallets.filter(w => w.receiveAddress === selectedAccountAddress),
    wallet => {
      return wallet.id;
    },
  );
  let pendingTxps: AccountProposalsProps = {};
  keyFullWalletObjs.forEach(x => {
    if (x.pendingTxps.length > 0) {
      pendingTxps[x.id] = Array.isArray(pendingTxps[x.id])
        ? pendingTxps[x.id].concat(x.pendingTxps)
        : x.pendingTxps;
    }
  });
  const pendingProposalsCount = Object.values(pendingTxps).length;
  const memorizedAccountList = useMemo(() => {
    return (
      buildAccountList(key, defaultAltCurrency.isoCode, rates, dispatch, {
        filterByHideWallet: true,
      }).filter(({chains}) => IsVMChain(chains[0])) || {}
    );
  }, [dispatch, key, defaultAltCurrency.isoCode, rates]);

  const accountItem = memorizedAccountList.find(
    a => a.receiveAddress === selectedAccountAddress,
  )!;
  const totalBalance = accountItem?.fiatBalanceFormat;
  const hasMultipleAccounts = memorizedAccountList.length > 1;

  const accounts = useAppSelector(
    ({SHOP}) => SHOP.billPayAccounts[accountItem?.wallets[0]?.network],
  );

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

  const keyOptions: Array<Option> = [];
  const hasAllChains =
    accountItem?.chains?.length ===
    Object.keys(
      isSvmAccount ? BitpaySupportedSvmCoins : BitpaySupportedEvmCoins,
    ).length;
  if (!isSvmAccount && !hasAllChains) {
    keyOptions.push({
      img: <Icons.Wallet width="15" height="15" />,
      title: t('Add Ethereum Networks'),
      description: t('Add all the supported networks to this account.'),
      onPress: async () => {
        haptic('impactLight');
        await sleep(500);
        const _key = key.methods as KeyMethods;
        let password: string | undefined;
        if (key.isPrivKeyEncrypted) {
          password = await dispatch(getDecryptPassword(Object.assign({}, key)));
        }
        await dispatch(startOnGoingProcessModal('ADDING_EVM_CHAINS'));
        const wallets = await dispatch(
          createMultipleWallets({
            key: _key,
            currencies: getBaseEVMAccountCreationCoinsAndTokens(),
            options: {
              network,
              password,
              account: accountItem?.accountNumber,
              customAccount: true,
            },
          }),
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
        dispatch(dismissOnGoingProcessModal());
      },
    });
  }
  keyOptions.push({
    img: <Icons.Settings />,
    title: t('Account Settings'),
    description: t('View all the ways to manage and configure your account.'),
    onPress: async () => {
      haptic('impactLight');
      await sleep(500);
      navigation.navigate('AccountSettings', {
        key,
        selectedAccountAddress: accountItem?.receiveAddress,
        context: 'accountDetails',
        isSvmAccount,
      });
    },
  });

  const setNeedActionTxps = (accountProposals: AccountProposalsProps) => {
    Object.entries(accountProposals).forEach(([walletId, pendingTxps]) => {
      const txpsPending: TransactionProposal[] = [];
      const txpsUnsent: TransactionProposal[] = [];
      const {
        currencyAbbreviation,
        chain,
        tokenAddress,
        credentials: {copayerId, n},
      } = keyFullWalletObjs.find(w => w.id === walletId) as Wallet;
      const formattedPendingTxps = BuildUiFriendlyList(
        pendingTxps,
        currencyAbbreviation,
        chain,
        [],
        tokenAddress,
        walletId,
      );
      formattedPendingTxps.forEach((txp: any) => {
        const action: any = _.find(txp.actions, {
          copayerId: copayerId,
        });

        const setPendingTx = (_txp: TransactionProposal) => {
          n > 1 ? txpsPending.push(_txp) : txpsUnsent.push(_txp);
          setNeedActionPendingTxps(txpsPending);
          setNeedActionUnsentTxps(txpsUnsent);
        };
        if ((!action || action.type === 'failed') && txp.status === 'pending') {
          setPendingTx(txp);
        }
        // unsent transactions
        if (action && txp.status === 'accepted') {
          setPendingTx(txp);
        }
      });
    });
  };

  const loadHistory = useCallback(
    async (
      _selectedChainFilterOption: string | undefined,
      refresh?: boolean,
    ) => {
      if (!loadMore && !refresh) {
        return;
      }
      try {
        setIsLoading(true);
        setErrorLoadingTxs(false);

        const [transactionHistory] = await Promise.all([
          dispatch(
            GetAccountTransactionHistory({
              wallets: keyFullWalletObjs,
              accountTransactionsHistory,
              keyId: key.id,
              limit: TX_HISTORY_LIMIT * loadMoreIndex,
              contactList,
              refresh,
              selectedChainFilterOption: _selectedChainFilterOption,
            }),
          ),
        ]);

        setLoadMoreIndex(loadMoreIndex + 1);
        if (transactionHistory) {
          let {accountTransactionsHistory, sortedCompleteHistory: _history} =
            transactionHistory;

          setAccountTransactionsHistory(accountTransactionsHistory);

          if (_history?.length) {
            setHistory(_history);
            const grouped = GroupTransactionHistory(_history);
            setGroupedHistory(grouped);
          } else {
            setGroupedHistory([]);
          }

          const hasLoadMore = Object.values(accountTransactionsHistory).some(
            ({loadMore}) => loadMore,
          );
          setLoadMore(hasLoadMore);
        }

        await sleep(1000);
        setIsLoading(false);
      } catch (e) {
        setLoadMore(false);
        setIsLoading(false);
        setErrorLoadingTxs(true);

        console.log('Transaction Update: ', e);
      }
    },
    [history],
  );

  const debouncedLoadHistory = useMemo(() => {
    const debounced = debounce(
      (_selectedChainFilterOption: string | undefined, refresh?: boolean) => {
        loadHistory(_selectedChainFilterOption, refresh);
      },
      300,
      {leading: true},
    );
    return debounced;
  }, [loadHistory]);

  const loadHistoryRef = useRef(debouncedLoadHistory);

  const updateWalletStatusAndProfileBalance = async () => {
    await dispatch(
      startUpdateAllWalletStatusForKey({
        key,
        accountAddress: accountItem?.receiveAddress,
        force: true,
      }),
    );
    dispatch(updatePortfolioBalance());
  };

  useEffect(() => {
    dispatch(Analytics.track('View Account'));
    const timer = setTimeout(() => {
      updateWalletStatusAndProfileBalance();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setNeedActionTxps(pendingTxps);
    const subscription = DeviceEventEmitter.addListener(
      DeviceEmitterEvents.WALLET_LOAD_HISTORY,
      (_selectedChainFilterOption?: string | undefined) => {
        const selected =
          _selectedChainFilterOption ?? selectedChainFilterOption;
        loadHistoryRef.current(selected, true);
        setNeedActionTxps(pendingTxps);
      },
    );
    return () => subscription.remove();
  }, [keys]);

  const keyExtractorAssets = useCallback(item => item.id, []);
  const keyExtractorTransaction = useCallback(
    item => `${item.txid}+${item.walletId}`,
    [],
  );
  const pendingTxpsKeyExtractor = useCallback(item => item.id, []);

  const getItemLayout = useCallback(
    (data: any, index: number) => ({
      length: TRANSACTION_ROW_HEIGHT,
      offset: TRANSACTION_ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  const listFooterComponentTxsTab = useCallback(() => {
    return (
      <>
        {isLoading || isLoading === undefined ? (
          <SkeletonContainer>
            <WalletTransactionSkeletonRow />
          </SkeletonContainer>
        ) : null}
      </>
    );
  }, [isLoading, groupedHistory]);

  const listFooterComponentAssetsTab = () => {
    return (
      <AddCustomTokenContainer
        accessibilityLabel="add-custom-token-button"
        onPress={() => {
          haptic('soft');
          if (memorizedAssetsByChainList?.[0].chains?.[0]) {
            navigation.navigate('AddCustomToken', {
              key,
              selectedAccountAddress: accountItem?.receiveAddress,
              selectedChain: memorizedAssetsByChainList[0].chains[0],
            });
          }
        }}>
        <BaseText>{t("Don't see your token?")}</BaseText>
        <Link>{t('Add Custom Token')}</Link>
      </AddCustomTokenContainer>
    );
  };

  useLayoutEffect(() => {
    if (!key) {
      return;
    }

    navigation.setOptions({
      headerTitle: () => {
        return (
          <AccountToogle
            activeOpacity={ActiveOpacity}
            disabled={!hasMultipleAccounts && !linkedCoinbase}
            onPress={() => setShowAccountDropdown(true)}>
            <View>
              <Row style={{alignItems: 'center'}}>
                <KeySvg width={10} height={10} />
                <CenteredText>{key?.keyName}</CenteredText>
              </Row>
              <Row style={{alignItems: 'center', gap: 5}}>
                {checkPrivateKeyEncrypted(key) ? (
                  <View style={{marginRight: 5}}>
                    {theme.dark ? (
                      <EncryptPasswordDarkModeImg />
                    ) : (
                      <EncryptPasswordImg />
                    )}
                  </View>
                ) : null}
                <HeaderTitle>{accountItem?.accountName}</HeaderTitle>
                {(hasMultipleAccounts || linkedCoinbase) && (
                  <ChevronContainer>
                    {!theme.dark ? (
                      <ChevronDownSvgLight width={8} height={8} />
                    ) : (
                      <ChevronDownSvgDark width={8} height={8} />
                    )}
                  </ChevronContainer>
                )}
              </Row>
            </View>
          </AccountToogle>
        );
      },
      headerRight: () => {
        return (
          <>
            <HeaderRightContainer
              style={{
                marginTop: -3,
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              {pendingProposalsCount ? (
                <ProposalBadgeContainer
                  touchableLibrary={'react-native-gesture-handler'}
                  style={{marginRight: 10}}
                  onPress={onPressTxpBadge}>
                  <ProposalBadge>{pendingProposalsCount}</ProposalBadge>
                </ProposalBadgeContainer>
              ) : null}
              {hasAllChains ? (
                <TouchableOpacity
                  touchableLibrary={'react-native-gesture-handler'}
                  onPress={() =>
                    navigation.navigate('AccountSettings', {
                      key,
                      selectedAccountAddress: accountItem?.receiveAddress,
                      context: 'accountDetails',
                      isSvmAccount,
                    })
                  }>
                  <Icons.AccountSettings />
                </TouchableOpacity>
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
  }, [navigation, key, accountItem, theme.dark]);

  const getBillPayIcon = (
    billPayAccounts: BillPayAccount[],
    merchantId: string,
  ): string => {
    const account = (billPayAccounts || []).find(
      acct => acct[acct.type].merchantId === merchantId,
    );
    return account ? account[account.type].merchantIcon : '';
  };

  const getTxDescriptionDetails = (key: string | undefined) => {
    if (!key) {
      return undefined;
    }
    switch (key) {
      case 'moonpay':
        return 'MoonPay';
      default:
        return undefined;
    }
  };

  const goToTransactionDetails = (transaction: any) => {
    const onTxDescriptionChange = () =>
      debouncedLoadHistory(selectedChainFilterOption, true);
    const fullWalletObj = findWalletById(
      keyFullWalletObjs,
      transaction.walletId,
    ) as Wallet;
    navigation.navigate('TransactionDetails', {
      wallet: fullWalletObj,
      transaction,
      onTxDescriptionChange,
    });
  };

  const onPressTransaction = useMemo(
    () => (transaction: any) => {
      const {hasUnconfirmedInputs, action, isRBF, coin, chain} = transaction;
      const isReceived = IsReceived(action);
      const isMoved = IsMoved(action);
      const currency = coin.toLowerCase();

      if (
        hasUnconfirmedInputs &&
        (isReceived || isMoved) &&
        currency === 'btc'
      ) {
        dispatch(
          showBottomNotificationModal(
            UnconfirmedInputs(() => goToTransactionDetails(transaction)),
          ),
        );
      } else if (isRBF && isReceived && currency === 'btc') {
        dispatch(
          showBottomNotificationModal(
            RbfTransaction(
              () => speedupTransaction(transaction),
              () => goToTransactionDetails(transaction),
            ),
          ),
        );
      } else if (CanSpeedupTx(transaction, currency, chain)) {
        if (chain === 'eth') {
          dispatch(
            showBottomNotificationModal(
              SpeedupEthTransaction(
                () => speedupTransaction(transaction),
                () => goToTransactionDetails(transaction),
              ),
            ),
          );
        } else {
          dispatch(
            showBottomNotificationModal(
              SpeedupTransaction(
                () => speedupTransaction(transaction),
                () => goToTransactionDetails(transaction),
              ),
            ),
          );
        }
      } else {
        goToTransactionDetails(transaction);
      }
    },
    [],
  );

  const speedupTransaction = async (transaction: any) => {
    try {
      let tx: any;
      const {currencyAbbreviation, chain} = transaction;
      const fullWalletObj = findWalletById(
        keyFullWalletObjs,
        transaction.walletId,
      ) as Wallet;
      if (chain.toLowerCase() === 'eth') {
        tx = await dispatch(
          buildEthERCTokenSpeedupTx(fullWalletObj, transaction),
        );
        goToConfirm(tx);
      }

      if (currencyAbbreviation.toLowerCase() === 'btc') {
        const address = await dispatch<Promise<string>>(
          createWalletAddress({wallet: fullWalletObj, newAddress: false}),
        );

        tx = await dispatch(
          buildBtcSpeedupTx(fullWalletObj, transaction, address),
        );

        dispatch(
          showBottomNotificationModal({
            type: 'warning',
            title: t('Miner fee notice'),
            message: t(
              'Because you are speeding up this transaction, the Bitcoin miner fee () will be deducted from the total.',
              {speedupFee: tx.speedupFee, currencyAbbreviation},
            ),
            enableBackdropDismiss: true,
            actions: [
              {
                text: t('Got It'),
                action: () => {
                  goToConfirm(tx);
                },
                primary: true,
              },
            ],
          }),
        );
      }
    } catch (e) {
      switch (e) {
        case 'InsufficientFunds':
          dispatch(showBottomNotificationModal(SpeedupInsufficientFunds()));
          break;
        case 'NoInput':
          dispatch(showBottomNotificationModal(SpeedupInvalidTx()));
          break;
        default:
          dispatch(
            showBottomNotificationModal(
              CustomErrorMessage({
                errMsg: t(
                  'Error getting "Speed Up" information. Please try again later.',
                ),
              }),
            ),
          );
      }
    }
  };

  const goToConfirm = async (tx: any) => {
    try {
      const {recipient, amount} = tx;
      const {txDetails, txp: newTxp} = await dispatch(
        createProposalAndBuildTxDetails(tx),
      );
      const fullWalletObj = findWalletById(
        keyFullWalletObjs,
        tx.walletId,
      ) as Wallet;
      navigation.navigate('Confirm', {
        wallet: fullWalletObj,
        recipient,
        txp: newTxp,
        txDetails,
        amount,
        speedup: true,
      });
    } catch (err: any) {
      const errorMessageConfig = await dispatch(
        handleCreateTxProposalError(err),
      );
      dispatch(
        showBottomNotificationModal({
          ...errorMessageConfig,
          enableBackdropDismiss: false,
        }),
      );
    }
  };

  const renderTransaction = useCallback(({item}) => {
    return (
      <TransactionRow
        key={item.txid}
        icon={
          item.customData?.recipientEmail ? (
            <ContactIcon
              name={item.customData?.recipientEmail}
              size={TRANSACTION_ICON_SIZE}
              badge={<SentBadgeSvg />}
            />
          ) : (
            TransactionIcons[item.uiIcon]
          )
        }
        iconURI={
          getBillPayIcon(accounts, item.uiIconURI) ||
          getGiftCardIcons(supportedCardMap)[item.uiIconURI]
        }
        description={item.uiDescription}
        details={getTxDescriptionDetails(item.customData?.service)}
        time={item.uiTime}
        value={item.uiValue}
        chain={item.chain}
        onPressTransaction={() => onPressTransaction(item)}
      />
    );
  }, []);

  const renderSectionHeader = useCallback(
    ({section: {title, time}}: {section: {title: string; time?: string}}) => {
      if (!time) {
        return <></>;
      }
      return (
        <TransactionSectionHeaderContainer key={time}>
          <H5>{title}</H5>
        </TransactionSectionHeaderContainer>
      );
    },
    [],
  );

  const onPressTxp = useMemo(
    () => (transaction: any) => {
      navigation.navigate('TransactionProposalDetails', {
        walletId: transaction.walletId,
        transactionId: transaction.id,
        keyId: key.id,
      });
    },
    [],
  );

  const renderTxp = useCallback(({item}) => {
    return (
      <TransactionProposalRow
        key={item.id}
        icon={TransactionIcons[item.uiIcon]}
        creator={item.uiCreator}
        time={item.uiTime}
        value={item.uiValue}
        message={item.message}
        onPressTransaction={() => onPressTxp(item)}
        recipientCount={item.recipientCount}
        toAddress={item.toAddress}
        tokenAddress={item.tokenAddress}
        chain={item.chain}
        contactList={contactList}
      />
    );
  }, []);

  const onPressItem = (walletId: string) => {
    haptic('impactLight');
    const fullWalletObj = findWalletById(keyFullWalletObjs, walletId) as Wallet;
    if (!fullWalletObj.isComplete()) {
      fullWalletObj.getStatus(
        {network: fullWalletObj.network},
        (err: any, status: Status) => {
          if (err) {
            const errStr =
              err instanceof Error ? err.message : JSON.stringify(err);
            LogActions.error(`[getStatus] Error: ${errStr}`);
          } else {
            if (status?.wallet?.status === 'complete') {
              fullWalletObj.openWallet({}, () => {
                navigation.navigate('WalletDetails', {
                  walletId,
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
        walletId,
      });
    }
  };

  const memoizedRenderAssetsItem = useCallback(
    ({item}: {item: AssetsByChainData}) => {
      return (
        <AssetsByChainRow
          id={item.id}
          accountItem={item}
          hideBalance={hideAllBalances}
          onPress={walletId => onPressItem(walletId)}
          showChainAssetsByDefault={memorizedAssetsByChainList.length === 1}
          showNetworkHeader={memorizedAssetsByChainList.length > 1}
        />
      );
    },
    [key, accountItem, hideAllBalances],
  );

  const onPressTxpBadge = useMemo(
    () => () => {
      navigation.navigate('TransactionProposalNotifications', {keyId: key.id});
    },
    [],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await sleep(1000);
    try {
      await dispatch(startGetRates({}));
      showActivityTab
        ? await debouncedLoadHistory(selectedChainFilterOption, true)
        : await dispatch(
            startUpdateAllWalletStatusForKey({
              key,
              accountAddress: accountItem?.receiveAddress,
              force: true,
              createTokenWalletWithFunds: true,
            }),
          );
      dispatch(updatePortfolioBalance());
      setNeedActionTxps(pendingTxps);
    } catch (err) {
      dispatch(showBottomNotificationModal(BalanceUpdateError()));
    }
    setRefreshing(false);
  };

  const itemSeparatorComponent = useCallback(() => <BorderBottom />, []);

  const listEmptyComponent = useCallback(() => {
    return (
      <>
        {!isLoading &&
          isLoading !== undefined &&
          !errorLoadingTxs &&
          !groupedHistory?.length && (
            <EmptyListContainer>
              <H5>{t("It's a ghost town in here")}</H5>
              <GhostSvg style={{marginTop: 20}} />
            </EmptyListContainer>
          )}

        {!isLoading && isLoading !== undefined && errorLoadingTxs && (
          <EmptyListContainer>
            <H5>{t('Could not update transaction history')}</H5>
            <GhostSvg style={{marginTop: 20}} />
          </EmptyListContainer>
        )}
      </>
    );
  }, [isLoading, errorLoadingTxs, groupedHistory]);

  const memorizedAssetsByChainList = useMemo(() => {
    return buildAssetsByChainList(accountItem, defaultAltCurrency.isoCode);
  }, [key, accountItem, defaultAltCurrency.isoCode]);

  const copyToClipboard = () => {
    haptic('impactLight');
    if (!copied) {
      Clipboard.setString(accountItem?.receiveAddress);
      setCopied(true);
    }
  };

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => {
      setCopied(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [copied]);

  const renderListHeaderComponent = useCallback(() => {
    return (
      <>
        <HeaderContainer>
          <BalanceContainer>
            <TouchableOpacity
              onLongPress={() => {
                dispatch(toggleHideAllBalances());
              }}>
              <Row>
                {!hideAllBalances ? (
                  <Balance scale={shouldScale(totalBalance)}>
                    {totalBalance}
                  </Balance>
                ) : (
                  <H2>****</H2>
                )}
              </Row>
            </TouchableOpacity>
            <BadgeContainerTouchable
              onPress={copyToClipboard}
              activeOpacity={ActiveOpacity}
              style={{alignSelf: 'center', width: 'auto', height: 25}}>
              <Badge style={{marginTop: 3}}>
                {formatCryptoAddress(accountItem?.receiveAddress)}
              </Badge>
              <CopyToClipboardContainer>
                {!copied ? <CopySvg width={10} /> : <CopiedSvg width={10} />}
              </CopyToClipboardContainer>
            </BadgeContainerTouchable>
          </BalanceContainer>
          <LinkingButtons
            buy={{
              cta: () => {
                dispatch(
                  Analytics.track('Clicked Buy Crypto', {
                    context: 'AccountDetails',
                  }),
                );
                navigation.navigate(WalletScreens.AMOUNT, {
                  onAmountSelected: async (
                    amount: string,
                    setButtonState: any,
                  ) => {
                    navigation.navigate('BuyCryptoRoot', {
                      amount: Number(amount),
                    });
                  },
                  context: 'buyCrypto',
                });
              },
            }}
            sell={{
              cta: () => {
                dispatch(
                  Analytics.track('Clicked Sell Crypto', {
                    context: 'AccountDetails',
                  }),
                );
                navigation.navigate('SellCryptoRoot');
              },
            }}
            swap={{
              cta: () => {
                dispatch(
                  Analytics.track('Clicked Swap Crypto', {
                    context: 'AccountDetails',
                  }),
                );
                navigation.navigate('SwapCryptoRoot');
              },
            }}
            receive={{
              cta: () => {
                dispatch(
                  Analytics.track('Clicked Receive', {
                    context: 'AccountDetails',
                  }),
                );
                setShowReceiveAddressBottomModal(true);
              },
            }}
            send={{
              cta: () => {
                navigation.navigate('GlobalSelect', {
                  context: 'send',
                  selectedAccountAddress: accountItem?.receiveAddress,
                });
              },
            }}
          />
          {Number(accountItem?.fiatLockedBalanceFormat) > 0 ? (
            <LockedBalanceContainer onPress={() => {}}>
              <View>
                <Description numberOfLines={1} ellipsizeMode={'tail'}>
                  {t('Total Locked Balance')}
                </Description>
              </View>

              <TailContainer>
                <Value>
                  {accountItem?.fiatLockedBalanceFormat}{' '}
                  {formatCurrencyAbbreviation(
                    key.wallets[1].currencyAbbreviation,
                  )}
                </Value>
              </TailContainer>
            </LockedBalanceContainer>
          ) : null}
        </HeaderContainer>
        <AssetsDataContainer>
          <HeaderListContainer>
            <WalletListHeader
              isActive={!showActivityTab}
              onPress={() => {
                setShowActivityTab(false);
              }}>
              <H5>{t('Assets')}</H5>
            </WalletListHeader>
            <WalletListHeader
              isActive={showActivityTab}
              onPress={async () => {
                setShowActivityTab(true);
                await sleep(200);
                debouncedLoadHistory(selectedChainFilterOption);
              }}>
              <H5>{t('Activity')}</H5>
            </WalletListHeader>
          </HeaderListContainer>
          {isSvmAccount ? null : (
            <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
              <SearchComponent<
                GroupedHistoryProps | Partial<AssetsByChainListProps>
              >
                searchVal={searchVal}
                setSearchVal={setSearchVal}
                searchResults={
                  !showActivityTab ? searchResultsAssets : searchResultsHistory
                }
                //@ts-ignore
                setSearchResults={
                  !showActivityTab
                    ? setSearchResultsAssets
                    : setSearchResultsHistory
                }
                searchFullList={
                  !showActivityTab ? memorizedAssetsByChainList : groupedHistory
                }
                context={
                  !showActivityTab ? 'accountassetsview' : 'accounthistoryview'
                }
              />
            </View>
          )}
        </AssetsDataContainer>
      </>
    );
  }, [
    showActivityTab,
    memorizedAssetsByChainList,
    groupedHistory,
    copied,
    hideAllBalances,
  ]);

  const renderDataSectionComponent = useMemo(() => {
    if (!searchVal && !selectedChainFilterOption) {
      return showActivityTab ? groupedHistory : memorizedAssetsByChainList;
    } else {
      return showActivityTab ? searchResultsHistory : searchResultsAssets;
    }
  }, [
    searchVal,
    selectedChainFilterOption,
    showActivityTab,
    searchResultsAssets,
    searchResultsHistory,
    groupedHistory,
    memorizedAssetsByChainList,
  ]);

  return (
    <AccountDetailsContainer>
      <SectionList
        refreshControl={
          <RefreshControl
            tintColor={theme.dark ? White : SlateDark}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListHeaderComponent={renderListHeaderComponent}
        ListFooterComponent={
          !showActivityTab
            ? listFooterComponentAssetsTab
            : listFooterComponentTxsTab
        }
        keyExtractor={
          !showActivityTab ? keyExtractorAssets : keyExtractorTransaction
        }
        //@ts-ignore
        sections={renderDataSectionComponent}
        renderItem={
          !showActivityTab ? memoizedRenderAssetsItem : renderTransaction
        }
        {...(showActivityTab && {
          renderSectionHeader,
          stickyHeaderIndices: [groupedHistory?.length],
          stickySectionHeadersEnabled: true,
          ItemSeparatorComponent: itemSeparatorComponent,
          onMomentumScrollBegin: () => setIsScrolling(true),
          onMomentumScrollEnd: () => setIsScrolling(false),
          onEndReached: () => {
            if (isScrolling) {
              debouncedLoadHistory(selectedChainFilterOption);
            }
          },
          onEndReachedThreshold: 0.3,
          maxToRenderPerBatch: 15,
        })}
        ListEmptyComponent={listEmptyComponent}
        getItemLayout={getItemLayout}
      />

      <SheetModal
        isVisible={showAccountDropdown}
        placement={'top'}
        onBackdropPress={() => setShowAccountDropdown(false)}>
        <AccountDropdown>
          <HeaderTitle style={{margin: 15}}>{t('Other Accounts')}</HeaderTitle>
          <AccountDropdownOptionsContainer>
            {Object.values(memorizedAccountList).map(_accountItem => (
              <DropdownOption
                key={_accountItem?.id}
                optionId={_accountItem?.id}
                optionName={_accountItem?.accountName}
                wallets={_accountItem?.wallets}
                totalBalance={_accountItem?.fiatBalance}
                onPress={(accountId: string) => {
                  setShowAccountDropdown(false);
                  const selectedAccountItem = memorizedAccountList.find(
                    account => account.id === accountId,
                  );
                  navigation.setParams({
                    keyId: selectedAccountItem?.keyId,
                    selectedAccountAddress: selectedAccountItem?.receiveAddress,
                  });
                }}
                defaultAltCurrencyIsoCode={defaultAltCurrency.isoCode}
                hideKeyBalance={hideAllBalances}
              />
            ))}
            {linkedCoinbase ? (
              <CoinbaseDropdownOption
                onPress={() => {
                  setShowAccountDropdown(false);
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
          </AccountDropdownOptionsContainer>
        </AccountDropdown>
      </SheetModal>

      {keyOptions.length > 0 ? (
        <OptionsSheet
          isVisible={showKeyOptions}
          title={t('Account Options')}
          options={keyOptions}
          closeModal={() => setShowKeyOptions(false)}
        />
      ) : null}

      {keyFullWalletObjs[0] ? (
        <ReceiveAddress
          isVisible={showReceiveAddressBottomModal}
          closeModal={() => setShowReceiveAddressBottomModal(false)}
          wallet={keyFullWalletObjs[0]}
          context={'accountdetails'}
        />
      ) : null}
    </AccountDetailsContainer>
  );
};

export default AccountDetails;
