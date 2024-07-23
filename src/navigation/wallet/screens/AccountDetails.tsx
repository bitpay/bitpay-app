import {useNavigation, useTheme} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import _ from 'lodash';
import React, {
  ReactElement,
  useCallback,
  useEffect,
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
import {Balance, BalanceContainer, formatFiat} from './KeyOverview';
import {
  FlatList,
  LogBox,
  RefreshControl,
  TouchableOpacity,
  View,
} from 'react-native';
import {H2} from '../../../components/styled/Text';
import {
  showBottomNotificationModal,
  toggleHideAllBalances,
} from '../../../store/app/app.actions';
import {
  formatFiatAmount,
  shouldScale,
  sleep,
} from '../../../utils/helper-methods';
import LinkingButtons from '../../tabs/home/components/LinkingButtons';
import {isCoinSupportedToBuy} from '../../services/buy-crypto/utils/buy-crypto-utils';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {SlateDark, White} from '../../../styles/colors';
import {startGetRates} from '../../../store/wallet/effects';
import {startUpdateAllWalletStatusForKey} from '../../../store/wallet/effects/status/status';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';
import {BalanceUpdateError} from '../components/ErrorMessages';
import {Rates} from '../../../store/rate/rate.models';
import {WalletRowProps} from '../../../components/list/WalletRow';
import AssetsByChainRow from '../../../components/list/AssetsByChainRow';
import {Hr} from '../../../components/styled/Containers';
import SearchComponent from '../../../components/chain-search/ChainSearch';

export type AccountDetailsScreenParamList = {
  accountItem: AccountRowProps;
  key?: Key;
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
  const {accountItem, skipInitializeHistory} = route.params;
  const [refreshing, setRefreshing] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const {keys} = useAppSelector(({WALLET}) => WALLET);
  const key = keys[accountItem.keyId];
  const [searchVal, setSearchVal] = useState('');
  const selectedChainFilterOption = useAppSelector(
    ({APP}) => APP.selectedChainFilterOption,
  );
  const {rates} = useAppSelector(({RATE}) => RATE);
  const [searchResults, setSearchResults] = useState(
    [] as AssetsByChainListProps[],
  );

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
    [key, hideAllBalances],
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
  }, [key, defaultAltCurrency.isoCode]);

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

      <View style={{marginBottom: 30}}>
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
        data={
          !searchVal && !selectedChainFilterOption
            ? memorizedAssetsByChainList
            : searchResults
        }
        renderItem={memoizedRenderItem}
      />
    </AccountDetailsContainer>
  );
};

export default AccountDetails;
