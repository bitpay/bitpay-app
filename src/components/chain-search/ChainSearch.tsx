import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet} from 'react-native';
import {useAppDispatch, useAppSelector} from '../../utils/hooks';
import {
  SearchRoundContainer,
  SearchRoundInput,
} from '../../components/styled/Containers';
import {groupBy} from '../../utils/array';
import {Action, LightBlue, Slate, White} from '../../styles/colors';
import {BaseText} from '../../components/styled/Text';
import SearchSvg from '../../../assets/img/search.svg';
import ChevronDownSvgLight from '../../../assets/img/chevron-down-lightmode.svg';
import ChevronDownSvgDark from '../../../assets/img/chevron-down-darkmode.svg';
import {debounce} from '../../utils/debounce';
import {AppActions} from '../../store/app';
import {useTranslation} from 'react-i18next';
import {cloneDeep} from '../../utils/object';
import {TransactionProposal, Wallet} from '../../store/wallet/wallet.models';
import {useTheme} from '../../contexts';
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

type SearchableWallet = Wallet | WalletRowProps;

const styles = StyleSheet.create({
  searchIconContainer: {
    margin: 14,
  },
  searchFilterContainer: {
    minWidth: 60,
    maxWidth: 150,
    flexShrink: 1,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    minHeight: 32,
    marginTop: 'auto' as any,
    marginRight: 8,
    marginBottom: 'auto' as any,
    marginLeft: 15,
    borderWidth: 1,
  },
  rowFilterContainer: {
    flexDirection: 'row',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSideContainer: {
    flexDirection: 'row',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    paddingRight: 35,
  },
  searchFilterLabelContainer: {
    marginLeft: 15,
    marginRight: 15,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
  },
  searchFilterLabel: {
    fontSize: 12,
    fontWeight: '400',
    minWidth: 70,
    flexShrink: 1,
  },
  searchFilterIconContainer: {
    marginRight: 12,
  },
});

export const SearchIconContainer: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => (
  <View style={[styles.searchIconContainer, style]} {...rest} />
);

export const SearchFilterContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.searchFilterContainer,
        {
          borderColor: theme.dark ? Action : 'transparent',
          backgroundColor: theme.dark ? '#2240C440' : LightBlue,
        },
        style,
      ]}
      {...rest}
    />
  );
};

export const RowFilterContainer: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => (
  <View style={[styles.rowFilterContainer, style]} {...rest} />
);

const LeftSideContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.leftSideContainer, style]} {...rest} />;

export const SearchFilterLabelContainer: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => (
  <View style={[styles.searchFilterLabelContainer, style]} {...rest} />
);

export const SearchFilterLabel: React.FC<
  React.ComponentProps<typeof BaseText>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <BaseText
      maxFontSizeMultiplier={1.4}
      style={[
        styles.searchFilterLabel,
        {color: theme.dark ? White : Action},
        style,
      ]}
      {...rest}
    />
  );
};

export const SearchFilterIconContainer: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => (
  <View style={[styles.searchFilterIconContainer, style]} {...rest} />
);

export interface SearchableItem {
  currencyName?: string;
  currencyAbbreviation?: string;
  walletName?: string;
  accountName?: string;
  chainAssetsList?: WalletRowProps[];
  chains?: string[]; // (Global Select view)
  wallets?: SearchableWallet[]; // (Key Overview view)
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

  // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced handler is memoized intentionally so the same debounce instance survives re-renders
  const updateSearchResults = useCallback(
    debounce((text: string) => {
      setSearchVal(text?.toLowerCase());
      const normalizedText = normalizeText(text);
      const hasActiveSearch = Boolean(
        normalizedText || selectedChainFilterOption,
      );
      let results = hasActiveSearch
        ? cloneDeep(searchFullList)
        : searchFullList;
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
              data.availableWalletsByKey = groupBy(
                data.availableWallets,
                'keyId',
              );
              data.availableWalletsByChain = groupBy(
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
        ['sell', 'send', 'swapFrom', 'contact', 'scanner'].includes(context)
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
                wallets?: SearchableWallet[];
              })[];

              const filteredAccounts = accounts
                ?.map(account => {
                  let filteredWallets = account.wallets || [];
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
      if (hasActiveSearch) {
        setSearchResults(results);
      }
    }, 300),
    [context, selectedChainFilterOption, searchFullList],
  );

  const updateSelectedChainInfo = () => {
    if (
      selectedChainFilterOption &&
      BitpaySupportedCoins[selectedChainFilterOption]
    ) {
      const coinInfo = BitpaySupportedCoins[selectedChainFilterOption];
      setCurrencyInfo(coinInfo);
    }
  };

  useEffect(() => {
    updateSearchResults(searchVal);
    updateSearchResults.flush();
    updateSelectedChainInfo();

    return () => {
      updateSearchResults.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-runs only when the chain filter or full list changes; searchVal and helpers are read at that time
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
            <SearchFilterLabel numberOfLines={2} ellipsizeMode="tail">
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
