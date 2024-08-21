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
import {EIP155_CHAINS} from '../../constants/WalletConnectV2';
import cloneDeep from 'lodash.clonedeep';
import {TransactionProposal, Wallet} from '../../store/wallet/wallet.models';
import {useTheme} from 'styled-components/native';
import {setLocalDefaultChainFilterOption} from '../../store/app/app.actions';
import ChainSelectorModal, {
  ignoreGlobalListContextList,
} from '../../components/modal/chain-selector/ChainSelector';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import {View} from 'react-native';
import {BitpaySupportedCoins, CurrencyOpts} from '../../constants/currencies';
import {AssetsByChainData} from '../../navigation/wallet/screens/AccountDetails';
import {AccountRowProps} from '../list/AccountListRow';

export const SearchIconContainer = styled.View`
  margin: 14px;
`;

export const SearchFilterContainer = styled.TouchableOpacity`
  position: absolute;
  right: 0;
  width: 120px;
  justify-content: center;
  align-items: center;
  border-radius: 20px;
  height: 32px;
  margin: 15px 8px 12px 15px;
  border: 1px solid ${({theme: {dark}}) => (dark ? Action : 'transparent')};
  background: ${({theme: {dark}}) => (dark ? '#2240C440' : '#ECEFFD')};
`;

export const RowFilterContainer = styled.View`
  flex-direction: row;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;

export const SearchFilterLabelContainer = styled.View`
  margin-left: 15px;
  margin-right: 15px;
`;

export const SearchFilterLabel = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : Action)};
  font-size: 12px;
  font-weight: 400;
`;

export const SearchFilterIconContainer = styled.View`
  margin-right: 12px;
`;

export interface SearchableItem {
  currencyName?: string;
  currencyAbbreviation?: string;
  chains?: string[]; // (Global Select view)
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
    | (AccountRowProps & {assetsByChain?: AssetsByChainData[]})[]; // Additional properties specific to WCV2SessionType or AssetList
  data?: TransactionProposal[] | AssetsByChainData[]; // Additional properties specific to TransactionHistory or AssetList
}

interface SearchComponentProps<T extends SearchableItem> {
  searchVal: string;
  setSearchVal: (val: string) => void;
  searchResults: T[];
  setSearchResults: (val: T[]) => void;
  searchFullList: T[];
  context: string;
  onModalHide?: () => void;
}

const SearchComponent = <T extends SearchableItem>({
  searchVal,
  setSearchVal,
  searchResults,
  setSearchResults,
  searchFullList,
  context,
  onModalHide,
}: SearchComponentProps<T>) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const theme = useTheme();
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyOpts | undefined>();

  const selectedChainFilterOption = useAppSelector(({APP}) =>
    ignoreGlobalListContextList.includes(context)
      ? APP.selectedLocalChainFilterOption
      : APP.selectedChainFilterOption,
  );

  const normalizeText = (text: string | undefined) =>
    text?.replace(/\s+/g, '')?.toLowerCase() || '';

  const filterAccounts = (
    accounts: string[],
    normalizedText: string,
    selectedChainFilterOption: string | undefined,
  ) =>
    accounts.filter(account => {
      const index = account.indexOf(':', account.indexOf(':') + 1);
      const protocolChainName = account.substring(0, index);
      const chain = normalizeText(EIP155_CHAINS[protocolChainName]?.chainName);
      const name = normalizeText(EIP155_CHAINS[protocolChainName]?.name);

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
      if (
        ['walletconnect'].includes(context) &&
        typeof results?.[0]?.accounts?.[0] === 'string'
      ) {
        results.forEach(
          data =>
            (data.accounts = filterAccounts(
              data.accounts! as string[],
              normalizedText,
              selectedChainFilterOption,
            )),
        );
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
      } else if (
        ['keysettings', 'keyoverview', 'accountassetsview'].includes(context) &&
        selectedChainFilterOption
      ) {
        results = results.reduce((acc: T[], data) => {
          const hasSelectedNetwork = selectedChainFilterOption
            ? data?.chains?.includes(selectedChainFilterOption)
            : true;
          if (hasSelectedNetwork) {
            acc.push(data);
          }
          return acc;
        }, []);
      } else if (
        ['accounthistoryview'].includes(context) &&
        selectedChainFilterOption
      ) {
        results = results.map(result => {
          const data = result?.data as TransactionProposal[];
          const filteredData = data?.filter(
            (tx: TransactionProposal) => tx.chain === selectedChainFilterOption,
          );
          return {...result, data: filteredData};
        });
      } else if (
        ['sell', 'send', 'swapFrom', 'coinbase', 'contact', 'scanner'].includes(
          context,
        ) &&
        selectedChainFilterOption
      ) {
        results = results
          .map(data => {
            const accounts = data.accounts as (AccountRowProps & {
              assetsByChain?: AssetsByChainData[];
            })[];
            const filteredAccounts = accounts
              ?.map(account => {
                if (account.chains?.includes(selectedChainFilterOption)) {
                  const assetsByChain =
                    account.assetsByChain as AssetsByChainData[];
                  const filteredAssetsByChain = assetsByChain?.filter(
                    ({chain}) => chain === selectedChainFilterOption,
                  );
                  return {...account, assetsByChain: filteredAssetsByChain};
                }
              })
              .filter(item => item);
            return {...data, accounts: filteredAccounts};
          })
          .filter(({accounts}) => accounts?.length);
      }
      setSearchResults(results);
    }, 300),
    [selectedChainFilterOption],
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
  }, [selectedChainFilterOption]);

  useEffect(() => {
    return () => {
      dispatch(setLocalDefaultChainFilterOption(undefined));
    };
  }, []);

  const _SearchFilterContainer = () => {
    return (
      <SearchFilterContainer
        onPress={() => {
          dispatch(AppActions.showChainSelectorModal({context}));
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
            <SearchFilterLabel>
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
          <SearchIconContainer>
            <SearchSvg height={16} width={16} />
          </SearchIconContainer>
          <SearchRoundInput
            placeholderTextColor={Slate}
            placeholder={t('Search')}
            onChangeText={updateSearchResults}
          />
          {_SearchFilterContainer()}
        </SearchRoundContainer>
      )}
      <ChainSelectorModal onModalHide={onModalHide} />
    </>
  );
};

export default SearchComponent;
