import {CommonActions, useNavigation, useTheme} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import _ from 'lodash';
import React, {
  ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {useTranslation} from 'react-i18next';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {
  AppDispatch,
  useAppDispatch,
  useAppSelector,
} from '../../../utils/hooks';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import styled from 'styled-components/native';
import {AccountRowProps} from '../../../components/list/AccountListRow';
import {
  Balance,
  BalanceContainer,
  formatFiat,
  KeyToggle as AccountToggle,
  CogIconContainer,
  KeyDropdown as AccountDropdown,
  KeyDropdownOptionsContainer as AccountDropdownOptionsContainer,
} from './KeyOverview';
import {
  FlatList,
  LogBox,
  RefreshControl,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BaseText,
  H2,
  H5,
  HeaderTitle,
  ProposalBadge,
} from '../../../components/styled/Text';
import {
  showBottomNotificationModal,
  toggleHideAllBalances,
} from '../../../store/app/app.actions';
import {
  formatCryptoAddress,
  formatFiatAmount,
  shouldScale,
  sleep,
} from '../../../utils/helper-methods';
import LinkingButtons from '../../tabs/home/components/LinkingButtons';
import {isCoinSupportedToBuy} from '../../services/buy-crypto/utils/buy-crypto-utils';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {LuckySevens, Slate30, SlateDark, White} from '../../../styles/colors';
import {startGetRates} from '../../../store/wallet/effects';
import {startUpdateAllWalletStatusForKey} from '../../../store/wallet/effects/status/status';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {BalanceUpdateError} from '../components/ErrorMessages';
import {Rates} from '../../../store/rate/rate.models';
import {WalletRowProps} from '../../../components/list/WalletRow';
import AssetsByChainRow from '../../../components/list/AssetsByChainRow';
import {
  ActiveOpacity,
  HeaderRightContainer,
  HeaderTitleContainer,
  Hr,
  ProposalBadgeContainer,
} from '../../../components/styled/Containers';
import SearchComponent from '../../../components/chain-search/ChainSearch';
import CopySvg from '../../../../assets/img/copy.svg';
import CopiedSvg from '../../../../assets/img/copied-success.svg';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import Icons from '../components/WalletIcons';
import EncryptPasswordDarkModeImg from '../../../../assets/img/tinyicon-encrypt-darkmode.svg';
import EncryptPasswordImg from '../../../../assets/img/tinyicon-encrypt.svg';
import Settings from '../../../components/settings/Settings';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import haptic from '../../../components/haptic-feedback/haptic';
import OptionsSheet, {Option} from '../components/OptionsSheet';
import Clipboard from '@react-native-clipboard/clipboard';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import CoinbaseDropdownOption from '../components/CoinbaseDropdownOption';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../tabs/TabsStack';
import {CoinbaseScreens} from '../../coinbase/CoinbaseGroup';
import DropdownOption from '../components/DropdownOption';

export type AccountDetailsScreenParamList = {
  accountItem: AccountRowProps;
  accountList: AccountRowProps[];
  key: Key;
  skipInitializeHistory?: boolean;
};

type AccountDetailsScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
  'AccountDetails'
>;

export interface AssetsByChainListProps {
  id: string;
  chain: string;
  chainName: string;
  chainImg: string | ((props?: any) => ReactElement);
  chainAssetsList: WalletRowProps[];
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

const AccountDetailsContainer = styled.SafeAreaView`
  flex: 1;
`;

const Row = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: flex-end;
`;

const SearchComponentContainer = styled.View`
  padding-right: 15px;
  padding-left: 15px;
  margin-top: 16px;
`;

const BadgeContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const Border = styled.View`
  border: 1px solid ${({theme: {dark}}) => (dark ? LuckySevens : Slate30)};
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  padding: 0px 5px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 5px;
`;

const Badge = styled(BaseText)`
  font-size: 10px;
  font-weight: 400;
  text-align: center;
`;

const WalletListHeader = styled.View`
  padding: 10px;
  margin-top: 10px;
`;

const CopyToClipboardContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  height: 20px;
`;

const buildUIFormattedAssetsList = (
  assetsByChainList: Array<AssetsByChainListProps>,
  wallet: WalletRowProps,
  defaultAltCurrencyIsoCode: string,
  currencyDisplay?: 'symbol',
) => {
  let assetsByChain = assetsByChainList.find(
    ({chain}) => chain === wallet.chain,
  ) as AssetsByChainListProps | undefined;
  if (assetsByChain) {
    (assetsByChain.fiatBalance += wallet.fiatBalance),
      (assetsByChain.fiatLockedBalance += wallet.fiatLockedBalance),
      (assetsByChain.fiatConfirmedLockedBalance +=
        wallet.fiatConfirmedLockedBalance),
      (assetsByChain.fiatSpendableBalance += wallet.fiatSpendableBalance),
      (assetsByChain.fiatPendingBalance += wallet.fiatPendingBalance),
      assetsByChain.chainAssetsList.push(wallet);
    assetsByChain.fiatBalanceFormat = formatFiat({
      fiatAmount: assetsByChain.fiatBalance ?? 0,
      defaultAltCurrencyIsoCode,
      currencyDisplay,
    });
    assetsByChain.fiatLockedBalanceFormat = formatFiat({
      fiatAmount: assetsByChain.fiatLockedBalance ?? 0,
      defaultAltCurrencyIsoCode,
      currencyDisplay,
    });
    assetsByChain.fiatConfirmedLockedBalanceFormat = formatFiat({
      fiatAmount: assetsByChain.fiatConfirmedLockedBalance ?? 0,
      defaultAltCurrencyIsoCode,
      currencyDisplay,
    });
    assetsByChain.fiatSpendableBalanceFormat = formatFiat({
      fiatAmount: assetsByChain.fiatSpendableBalance ?? 0,
      defaultAltCurrencyIsoCode,
      currencyDisplay,
    });
    assetsByChain.fiatPendingBalanceFormat = formatFiat({
      fiatAmount: assetsByChain.fiatPendingBalance ?? 0,
      defaultAltCurrencyIsoCode,
      currencyDisplay,
    });
  } else {
    assetsByChainList.push({
      id: _.uniqueId('chain_'),
      chain: wallet.chain,
      chainImg: wallet.badgeImg || wallet.img,
      chainName: wallet.chainName,
      fiatBalance: wallet.fiatBalance,
      fiatLockedBalance: wallet.fiatLockedBalance,
      fiatConfirmedLockedBalance: wallet.fiatConfirmedLockedBalance,
      fiatSpendableBalance: wallet.fiatSpendableBalance,
      fiatPendingBalance: wallet.fiatPendingBalance,
      fiatBalanceFormat: formatFiat({
        fiatAmount: wallet.fiatBalance ?? 0,
        defaultAltCurrencyIsoCode,
        currencyDisplay,
      }),
      fiatLockedBalanceFormat: formatFiat({
        fiatAmount: wallet.fiatLockedBalance ?? 0,
        defaultAltCurrencyIsoCode,
        currencyDisplay,
      }),
      fiatConfirmedLockedBalanceFormat: formatFiat({
        fiatAmount: wallet.fiatConfirmedLockedBalance ?? 0,
        defaultAltCurrencyIsoCode,
        currencyDisplay,
      }),
      fiatSpendableBalanceFormat: formatFiat({
        fiatAmount: wallet.fiatSpendableBalance ?? 0,
        defaultAltCurrencyIsoCode,
        currencyDisplay,
      }),
      fiatPendingBalanceFormat: formatFiat({
        fiatAmount: wallet.fiatPendingBalance ?? 0,
        defaultAltCurrencyIsoCode,
        currencyDisplay,
      }),
      chainAssetsList: [wallet],
    });
  }
};

const buildAssetsByChainList = (
  accountItem: AccountRowProps,
  defaultAltCurrencyIso: string,
) => {
  const assetsByChainList: Array<AssetsByChainListProps> = [];
  accountItem.wallets.forEach(coin => {
    buildUIFormattedAssetsList(
      assetsByChainList,
      coin,
      defaultAltCurrencyIso,
      'symbol',
    );
  });
  return assetsByChainList;
};

const AccountDetails: React.FC<AccountDetailsScreenProps> = ({route}) => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const {defaultAltCurrency, hideAllBalances} = useAppSelector(({APP}) => APP);
  const {t} = useTranslation();
  const {accountItem, accountList, skipInitializeHistory} = route.params;
  const [refreshing, setRefreshing] = useState(false);
  const {keys} = useAppSelector(({WALLET}) => WALLET);
  const [copied, setCopied] = useState(false);
  const key = keys[accountItem.keyId];
  const totalBalance = accountItem.fiatBalanceFormat;
  const hasMultipleAccounts = accountList.length > 1;
  const [searchVal, setSearchVal] = useState('');
  const selectedChainFilterOption = useAppSelector(
    ({APP}) => APP.selectedChainFilterOption,
  );
  const [searchResults, setSearchResults] = useState(
    [] as AssetsByChainListProps[],
  );
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const linkedCoinbase = useAppSelector(
    ({COINBASE}) => !!COINBASE.token[COINBASE_ENV],
  );
  const [showKeyOptions, setShowKeyOptions] = useState(false);
  let pendingTxps: any = [];
  // TODO
  accountItem?.wallets.forEach(x => {
    if (x.pendingTxps) {
      pendingTxps = pendingTxps.concat(x.pendingTxps);
    }
  });

  useLayoutEffect(() => {
    if (!key) {
      return;
    }

    navigation.setOptions({
      headerTitle: () => {
        return (
          <AccountToggle
            activeOpacity={ActiveOpacity}
            disabled={!hasMultipleAccounts && !linkedCoinbase}
            onPress={() => setShowAccountDropdown(true)}>
            {key.methods?.isPrivKeyEncrypted() ? (
              theme.dark ? (
                <EncryptPasswordDarkModeImg />
              ) : (
                <EncryptPasswordImg />
              )
            ) : null}
            <HeaderTitleContainer>
              <HeaderTitle style={{textAlign: 'center'}}>
                {accountItem?.accountName}
              </HeaderTitle>
              {(hasMultipleAccounts || linkedCoinbase) && (
                <ChevronDownSvg style={{marginLeft: 10}} />
              )}
            </HeaderTitleContainer>
          </AccountToggle>
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
  }, [navigation, key, accountItem, theme.dark]);

  const memoizedRenderItem = useCallback(
    ({item}: {item: AssetsByChainListProps}) => {
      return (
        <AssetsByChainRow
          id={item.id}
          accountItem={item}
          hideBalance={hideAllBalances}
          onPress={(walletId: string) => {
            navigation.navigate(WalletScreens.WALLET_DETAILS, {
              walletId,
            });
          }}
        />
      );
    },
    [key, accountItem, hideAllBalances],
  );

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

  const memorizedAssetsByChainList = useMemo(() => {
    return buildAssetsByChainList(accountItem, defaultAltCurrency.isoCode);
  }, [key, accountItem, defaultAltCurrency.isoCode]);

  const copyToClipboard = () => {
    haptic('impactLight');
    if (!copied) {
      Clipboard.setString(accountItem.receiveAddress);
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

  return (
    <AccountDetailsContainer>
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
        <BadgeContainer>
          <Border>
            <Badge>{formatCryptoAddress(accountItem.receiveAddress)}</Badge>
            <CopyToClipboardContainer
              onPress={copyToClipboard}
              activeOpacity={ActiveOpacity}>
              {!copied ? <CopySvg width={10} /> : <CopiedSvg width={10} />}
            </CopyToClipboardContainer>
          </Border>
        </BadgeContainer>
      </BalanceContainer>
      <View style={{marginBottom: 30, marginTop: 30}}>
        <LinkingButtons
          buy={{
            cta: () => {
              dispatch(
                Analytics.track('Clicked Buy Crypto', {
                  context: 'AccountDetails',
                }),
              );
              navigation.navigate(WalletScreens.AMOUNT, {
                onAmountSelected: async (amount: string) => {
                  // navigation.navigate('BuyCryptoRoot', {
                  //   amount: Number(amount),
                  //   fromWallet: fullWalletObj,
                  // });
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
              // navigation.navigate('SellCryptoRoot', {
              //   fromWallet: fullWalletObj,
              // });
            },
          }}
          swap={{
            cta: () => {
              dispatch(
                Analytics.track('Clicked Swap Crypto', {
                  context: 'AccountDetails',
                }),
              );
              // navigation.navigate('SwapCryptoRoot', {
              //   selectedWallet: fullWalletObj,
              // });
            },
          }}
          receive={{
            cta: () => {
              dispatch(
                Analytics.track('Clicked Receive', {
                  context: 'AccountDetails',
                }),
              );
              // setShowReceiveAddressBottomModal(true);
            },
          }}
          send={{
            cta: () => {
              dispatch(
                Analytics.track('Clicked Send', {
                  context: 'AccountDetails',
                }),
              );
              // navigation.navigate('SendTo', {wallet: fullWalletObj});
            },
          }}
        />
      </View>

      <Hr />

      <SearchComponentContainer>
        <SearchComponent<AssetsByChainListProps>
          searchVal={searchVal}
          setSearchVal={setSearchVal}
          searchResults={searchResults}
          setSearchResults={setSearchResults}
          searchFullList={memorizedAssetsByChainList}
          context={'keyoverview'}
        />
      </SearchComponentContainer>

      <FlatList<AssetsByChainListProps>
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
              <H5>{t('Assets')}</H5>
            </WalletListHeader>
          );
        }}
        data={
          !searchVal && !selectedChainFilterOption
            ? memorizedAssetsByChainList
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
        isVisible={showAccountDropdown}
        placement={'top'}
        onBackdropPress={() => setShowAccountDropdown(false)}>
        <AccountDropdown>
          <HeaderTitle style={{margin: 15}}>{t('Other Accounts')}</HeaderTitle>
          <AccountDropdownOptionsContainer>
            {Object.values(accountList).map(_accountItem => (
              <DropdownOption
                key={_accountItem.id}
                optionId={_accountItem.id}
                optionName={_accountItem.accountName}
                wallets={_accountItem.wallets}
                totalBalance={_accountItem.fiatBalance}
                onPress={(accountId: string) => {
                  setShowAccountDropdown(false);
                  const selectedAccountItem = accountList.find(
                    account => account.id === accountId,
                  );
                  navigation.setParams({
                    key,
                    accountItem: selectedAccountItem,
                    accountList,
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
    </AccountDetailsContainer>
  );
};

export default AccountDetails;
