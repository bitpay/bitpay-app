import React, {useCallback, useEffect, useState} from 'react';
import styled from 'styled-components/native';
import {useAppDispatch, useAppSelector} from '../../utils/hooks';
import {
  SearchRoundContainer,
  SearchRoundInput,
} from '../../components/styled/Containers';
import _ from 'lodash';
import {Action, Slate, White} from '../../styles/colors';
import {BaseText} from '../../components/styled/Text';
import SearchSvg from '../../../assets/img/search.svg';
import ChevronDownSvgLight from '../../../assets/img/chevron-down-lightmode.svg';
import ChevronDownSvgDark from '../../../assets/img/chevron-down-darkmode.svg';
import debounce from 'lodash.debounce';
import {AppActions} from '../../store/app';
import {useTranslation} from 'react-i18next';
import {WC_SUPPORTED_CHAINS} from '../../constants/WalletConnectV2';
import cloneDeep from 'lodash.clonedeep';
import {TransactionProposal, Wallet} from '../../store/wallet/wallet.models';
import {useTheme} from 'styled-components/native';
import {ignoreGlobalListContextList} from '../../components/modal/chain-selector/ChainSelector';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import {View} from 'react-native';
import {
  BitpaySupportedCoins,
  CurrencyOpts,
  SUPPORTED_VM_TOKENS,
} from '../../constants/currencies';
import {AssetsByChainData} from '../../navigation/wallet/screens/AccountDetails';
import {AccountRowProps} from '../list/AccountListRow';
import {WalletRowProps} from '../list/WalletRow';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

export const SearchIconContainer = styled.View`
  margin: 14px;
`;

export const SearchFilterContainer = styled(TouchableOpacity)`
  min-width: 60px;
  max-width: 130px;
  justify-content: center;
  align-items: center;
  border-radius: 20px;
  height: 32px;
  margin: auto 8px auto 15px;
  border: 1px solid ${({theme: {dark}}) => (dark ? Action : 'transparent')};
  background: ${({theme: {dark}}) => (dark ? '#2240C440' : '#ECEFFD')};
`;

export const RowFilterContainer = styled.View`
  flex-direction: row;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const LeftSideContainer = styled.View`
  flex-direction: row;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex: 1 1 auto;
  padding-right: 35px;
`;

export const SearchFilterLabelContainer = styled.View`
  margin-left: 15px;
  margin-right: 15px;
  flex: 1 1 auto;
`;

export const SearchFilterLabel = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : Action)};
  font-size: 12px;
  font-weight: 400;
  min-width: 70px;
`;

export const SearchFilterIconContainer = styled.View`
  margin-right: 12px;
`;

export interface SearchableItem {
  currencyName?: string;
  currencyAbbreviation?: string;
  walletName?: string;
  accountName?: string;
  chainAssetsList?: WalletRowProps[];
  chains?: string[]; // (Global Select view)
  wallets?: Wallet[]; // (Key Overview view)
  chain?: string; // (Key Overview view)
  availableWallets?: Wallet[];
  availableWalletsByKey?: {
    [key: string]: Wallet[];
  };
  availableWalletsByChain?: {
    [key: string]: Wallet[];
  };
  total?: number;
  accounts?:
    | string[]
    | (AccountRowProps & {assetsByChain?: AssetsByChainData[]})[]; // Additional properties specific to AssetList
  data?: TransactionProposal[] | AssetsByChainData[]; // Additional properties specific to TransactionHistory or AssetList
  currency?: CurrencyOpts; // Additional properties specific to AddWallet context
}

interface SearchComponentProps<T extends SearchableItem> {
  searchVal: string;
  setSearchVal: (val: string) => void;
  searchResults: T[];
  setSearchResults: (val: T[]) => void;
  searchFullList: T[];
  context: string;
  hideFilter?: boolean;
}

const SearchComponent = <T extends SearchableItem>({
  searchVal,
  setSearchVal,
  searchResults,
  setSearchResults,
  searchFullList,
  context,
  hideFilter,
}: SearchComponentProps<T>) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const theme = useTheme();
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyOpts | undefined>();
  const [chainsOptions, setChainsOptions] = useState<string[]>();

  const selectedChainFilterOption = useAppSelector(({APP}) =>
    ignoreGlobalListContextList.includes(context)
      ? APP.selectedLocalChainFilterOption
      : APP.selectedChainFilterOption,
  );

  const normalizeText = (text: string | undefined) =>
    text?.replace(/\s+/g, '')?.toLowerCase() || '';

  const filterAccountsAndPolulateChainsOptions = (
    accounts: string[],
    normalizedText: string,
    selectedChainFilterOption: string | undefined,
    chains: string[],
  ) =>
    accounts.filter(account => {
      const index = account.indexOf(':', account.indexOf(':') + 1);
      const protocolChainName = account.substring(0, index);
      const chain = normalizeText(
        WC_SUPPORTED_CHAINS[protocolChainName]?.chainName,
      );
      const name = normalizeText(WC_SUPPORTED_CHAINS[protocolChainName]?.name);
      chains.push(chain);
      return (
        (chain.includes(normalizedText) ||
          name.includes(normalizedText) ||
          !normalizedText) &&
        (selectedChainFilterOption === chain || !selectedChainFilterOption)
      );
    });

  const updateSearchResults = useCallback(
    debounce((text: string) => {
      setSearchVal(text?.toLowerCase());
      const normalizedText = normalizeText(text);
      let results = cloneDeep(searchFullList);
      // Ignore error when there is no results
      if (['addUtxoWallet', 'addEVMWallet'].includes(context)) {
        const chains = searchFullList.flatMap(
          data => data?.currency?.chain || [],
        );
        setChainsOptions(chains);
      } else if (['accountsettings'].includes(context)) {
        results = results.reduce((acc: T[], data) => {
          if (
            selectedChainFilterOption &&
            data.chain !== selectedChainFilterOption
          ) {
            return acc;
          }

          const normalizedCurrencyAbbreviation = normalizeText(
            data.currencyAbbreviation,
          );
          const normalizedWalletName = normalizeText(data.walletName);
          const normalizedCurrencyName = normalizeText(data.currencyName);
          const hasMatchingAbbreviation =
            normalizedCurrencyAbbreviation.includes(normalizedText);
          const hasMatchingWalletName =
            normalizedWalletName.includes(normalizedText);
          const hasMatchingCurrencyName =
            normalizedCurrencyName.includes(normalizedText);
          const hasMatching =
            hasMatchingAbbreviation ||
            hasMatchingCurrencyName ||
            hasMatchingWalletName;

          if (hasMatching) {
            acc.push(data);
          }

          return acc;
        }, []);
        const chains = [
          ...new Set(searchFullList.flatMap(data => data.chains || [])),
        ];
        setChainsOptions(chains);
      } else if (['receive', 'swapTo', 'buy'].includes(context)) {
        results = results.reduce((acc: T[], data) => {
          const normalizedCurrencyAbbreviation = normalizeText(
            data?.currencyAbbreviation,
          );
          const normalizedCurrencyName = normalizeText(data.currencyName);
          const hasMatchingAbbreviation =
            normalizedCurrencyAbbreviation.includes(normalizedText);
          const hasMatchingCurrencyName =
            normalizedCurrencyName.includes(normalizedText);
          const hasMatching =
            hasMatchingAbbreviation || hasMatchingCurrencyName;
          if (
            (normalizedText.length > 0 ? hasMatching : true) &&
            (selectedChainFilterOption
              ? data?.chains?.includes(selectedChainFilterOption)
              : true)
          ) {
            if (
              selectedChainFilterOption &&
              data?.chains?.includes(selectedChainFilterOption) &&
              data.availableWallets
            ) {
              data.availableWallets = data.availableWallets.filter(
                wallet => wallet.chain === selectedChainFilterOption,
              );
              data.total = data.availableWallets.length;
              data.availableWalletsByKey = _.groupBy(
                data.availableWallets,
                'keyId',
              );
              data.availableWalletsByChain = _.groupBy(
                data.availableWallets,
                'chain',
              );
            }

            acc.push(data);
          }

          return acc;
        }, []);
        const chains = [
          ...new Set(searchFullList.flatMap(data => data.chains || [])),
        ];
        setChainsOptions(chains);
      } else if (
        ['keysettings', 'keyoverview', 'accountassetsview'].includes(context)
      ) {
        if (selectedChainFilterOption || normalizedText) {
          results = results.reduce((acc: T[], data) => {
            const hasSelectedNetwork =
              !selectedChainFilterOption ||
              data?.chains?.includes(selectedChainFilterOption);

            if (hasSelectedNetwork) {
              const normalizedAccountName = normalizeText(data?.accountName);
              const hasMatchingAccountName =
                normalizedAccountName?.includes(normalizedText);

              if (hasMatchingAccountName) {
                acc.push(data);
              } else if (normalizedText) {
                data.wallets = data?.wallets?.filter(element => {
                  const normalizedCurrencyAbbreviation = normalizeText(
                    element.currencyAbbreviation,
                  );
                  const normalizedCurrencyName = normalizeText(
                    element.currencyName,
                  );
                  return (
                    normalizedCurrencyAbbreviation.includes(normalizedText) ||
                    normalizedCurrencyName.includes(normalizedText)
                  );
                });

                if (data.wallets?.length) {
                  acc.push(data);
                }
              } else {
                acc.push(data);
              }
            }

            return acc;
          }, []);
        }
        const chains = [
          ...new Set(searchFullList.flatMap(data => data.chains || [])),
        ];
        setChainsOptions(chains);
      } else if (['accounthistoryview'].includes(context)) {
        if (selectedChainFilterOption) {
          results = results
            .map(result => {
              const data = result?.data as TransactionProposal[];
              const filteredData = data?.filter(
                (tx: TransactionProposal) =>
                  tx.chain === selectedChainFilterOption,
              );
              return {...result, data: filteredData};
            })
            .filter(result => result.data.length > 0);
        }
        let chains = SUPPORTED_VM_TOKENS;
        if (searchFullList.length > 0) {
          chains = [
            ...new Set(searchFullList.flatMap(data => data.chains || [])),
          ];
        }
        setChainsOptions(chains);
      } else if (
        ['sell', 'send', 'swapFrom', 'coinbase', 'contact', 'scanner'].includes(
          context,
        )
      ) {
        const hasChainAssetsList = searchFullList[0]?.chainAssetsList;
        const isFilterActive = selectedChainFilterOption || normalizedText;
        if (isFilterActive) {
          results = results.reduce((acc: T[], data) => {
            if (hasChainAssetsList) {
              let filteredChainAssetsList = (
                data.chainAssetsList as WalletRowProps[]
              ).filter(asset => {
                if (selectedChainFilterOption !== asset.chain) {
                  return false;
                }
                const normalizedWalletName = normalizeText(asset?.walletName);
                const normalizedCurrencyAbbreviation = normalizeText(
                  asset?.currencyAbbreviation,
                );
                const normalizedCurrencyName = normalizeText(
                  asset.currencyName,
                );
                return (
                  normalizedCurrencyAbbreviation.includes(normalizedText) ||
                  normalizedCurrencyName.includes(normalizedText) ||
                  normalizedWalletName.includes(normalizedText)
                );
              });

              if (filteredChainAssetsList?.length) {
                acc.push({...data, chainAssetsList: filteredChainAssetsList});
              }
            } else {
              const accounts = data.accounts as (AccountRowProps & {
                assetsByChain?: AssetsByChainData[];
                wallets?: Wallet[];
              })[];

              const filteredAccounts = accounts
                ?.map(account => {
                  let filteredWallets = account.wallets as Wallet[];
                  if (selectedChainFilterOption) {
                    filteredWallets = filteredWallets?.filter(
                      ({chain}) => chain === selectedChainFilterOption,
                    );
                    if (!filteredWallets?.length) {
                      return null;
                    }
                  }

                  const normalizedAccountName = normalizeText(
                    account.accountName,
                  );
                  const hasMatchingAccountName = normalizedText
                    ? normalizedAccountName.includes(normalizedText)
                    : false;

                  if (hasMatchingAccountName) {
                    return account;
                  }

                  if (normalizedText) {
                    filteredWallets = filteredWallets?.filter(
                      ({chain, chainName}) =>
                        chain.includes(normalizedText) ||
                        chainName.includes(normalizedText),
                    );
                    if (!filteredWallets?.length) {
                      return null;
                    }
                  }

                  return {...account, wallets: filteredWallets};
                })
                .filter(item => item && item.wallets?.length);

              if (filteredAccounts?.length) {
                acc.push({...data, accounts: filteredAccounts});
              }
            }
            return acc;
          }, []);
        }

        const chains = hasChainAssetsList
          ? [
              ...new Set(
                searchFullList.flatMap(data => {
                  const wallets = data.chainAssetsList as WalletRowProps[];
                  return wallets.flatMap(wallet => wallet.chain || []);
                }),
              ),
            ]
          : [
              ...new Set(
                searchFullList.flatMap(data => {
                  const accounts = data.accounts as (AccountRowProps & {
                    assetsByChain?: AssetsByChainData[];
                  })[];
                  return accounts.flatMap(account => account.chains || []);
                }),
              ),
            ];

        setChainsOptions(chains);
      }
      setSearchResults(results);
    }, 300),
    [selectedChainFilterOption, searchFullList],
  );

  const updateSelectedChainInfo = () => {
    if (
      selectedChainFilterOption &&
      BitpaySupportedCoins[selectedChainFilterOption]
    ) {
      const currencyInfo = BitpaySupportedCoins[selectedChainFilterOption];
      setCurrencyInfo(currencyInfo);
    }
  };

  useEffect(() => {
    updateSearchResults(searchVal);
    updateSelectedChainInfo();
  }, [selectedChainFilterOption, searchFullList]);

  const _SearchFilterContainer = () => {
    return (
      <SearchFilterContainer
        onPress={() => {
          dispatch(AppActions.showChainSelectorModal({context, chainsOptions}));
        }}>
        <RowFilterContainer>
          {selectedChainFilterOption && currencyInfo ? (
            <View style={{marginLeft: 5}}>
              <CurrencyImage img={currencyInfo.img!} size={25} />
            </View>
          ) : null}
          <SearchFilterLabelContainer
            style={
              selectedChainFilterOption && currencyInfo ? {marginLeft: 5} : null
            }>
            <SearchFilterLabel numberOfLines={1} ellipsizeMode="tail">
              {selectedChainFilterOption && currencyInfo
                ? currencyInfo.name
                : t('All Networks')}
            </SearchFilterLabel>
          </SearchFilterLabelContainer>
          <SearchFilterIconContainer>
            {!theme.dark ? (
              <ChevronDownSvgLight width={10} height={6} />
            ) : (
              <ChevronDownSvgDark width={10} height={6} />
            )}
          </SearchFilterIconContainer>
        </RowFilterContainer>
      </SearchFilterContainer>
    );
  };

  return (
    <>
      {['keyoverview', 'accountassetsview', 'accounthistoryview'].includes(
        context,
      ) ? (
        _SearchFilterContainer()
      ) : (
        <SearchRoundContainer>
          <LeftSideContainer>
            <SearchIconContainer>
              <SearchSvg height={16} width={16} />
            </SearchIconContainer>
            <View>
              <SearchRoundInput
                placeholderTextColor={Slate}
                placeholder={t('Search')}
                onChangeText={updateSearchResults}
              />
            </View>
          </LeftSideContainer>
          {hideFilter ? null : _SearchFilterContainer()}
        </SearchRoundContainer>
      )}
    </>
  );
};

export default SearchComponent;
