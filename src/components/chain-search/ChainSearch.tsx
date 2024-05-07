import React, {useCallback, useEffect} from 'react';
import styled from 'styled-components/native';
import {useAppDispatch, useAppSelector} from '../../utils/hooks';
import {
  SearchRoundContainer,
  SearchRoundInput,
} from '../../components/styled/Containers';
import _ from 'lodash';
import {Action, Slate, SlateDark, White} from '../../styles/colors';
import {BaseText} from '../../components/styled/Text';
import SearchSvg from '../../../assets/img/search.svg';
import ChevronDownSvgLight from '../../../assets/img/chevron-down-lightmode.svg';
import ChevronDownSvgDark from '../../../assets/img/chevron-down-darkmode.svg';
import CloseSvgDark from '../../../assets/img/close-darkmode.svg';
import CloseSvgLight from '../../../assets/img/close-lightmode.svg';
import debounce from 'lodash.debounce';
import {AppActions} from '../../store/app';
import {useTranslation} from 'react-i18next';
import {EIP155_CHAINS} from '../../constants/WalletConnectV2';
import cloneDeep from 'lodash.clonedeep';
import {Wallet} from '../../store/wallet/wallet.models';
import {useTheme} from 'styled-components/native';
import {setDefaultChainFilterOption} from '../../store/app/app.actions';

export const SearchIconContainer = styled.View`
  margin: 14px;
`;

export const SearchFilterContainer = styled.TouchableOpacity`
  position: absolute;
  right: 0;
  justify-content: center;
  align-items: center;
  border-radius: 20px;
  height: 32px;
  margin: 15px 8px 12px 15px;
  border: 1px solid ${({theme: {dark}}) => (dark ? Action : 'transparent')};
  background: ${({theme: {dark}}) => (dark ? '#2240C440' : '#ECEFFD')};
`;

export const SelectedChainFilterContainer = styled(SearchFilterContainer)`
  right: 140px;
  margin: 8px 8px 8px 8px;
  border: 1px solid ${({theme: {dark}}) => (dark ? SlateDark : Action)};
  background-color: transparent;
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

export const SelectedChainFilterLabelContainer = styled(
  SearchFilterLabelContainer,
)`
  margin-right: 10px;
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
  accounts?: string[]; // Additional properties specific to WCV2SessionType
}

interface SearchComponentProps<T extends SearchableItem> {
  searchVal: string;
  setSearchVal: (val: string) => void;
  searchResults: T[];
  setSearchResults: (val: T[]) => void;
  searchFullList: T[];
}

const SearchComponent = <T extends SearchableItem>({
  searchVal,
  setSearchVal,
  searchResults,
  setSearchResults,
  searchFullList,
}: SearchComponentProps<T>) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const theme = useTheme();
  const selectedChainFilterOption = useAppSelector(
    ({APP}) => APP.selectedChainFilterOption,
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
      setSearchVal(text);
      const normalizedText = normalizeText(text);
      let results = cloneDeep(searchFullList);
      if (results?.[0].accounts) {
        results.forEach(
          data =>
            (data.accounts = filterAccounts(
              data.accounts!,
              normalizedText,
              selectedChainFilterOption,
            )),
        );
      } else {
        results = results.reduce((acc: T[], data) => {
          if (data.chain) {
            data.chains = [data.chain]; // Workaround for Key Overview view
          }

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
      }
      setSearchResults(results);
    }, 300),
    [selectedChainFilterOption],
  );

  useEffect(() => {
    updateSearchResults(searchVal);
  }, [selectedChainFilterOption]);

  return (
    <SearchRoundContainer>
      <SearchIconContainer>
        <SearchSvg height={16} width={16} />
      </SearchIconContainer>
      <SearchRoundInput
        placeholderTextColor={Slate}
        placeholder={t('Search')}
        onChangeText={updateSearchResults}
      />
      {selectedChainFilterOption ? (
        <SelectedChainFilterContainer
          onPress={() => {
            dispatch(setDefaultChainFilterOption(undefined));
          }}>
          <RowFilterContainer>
            <SelectedChainFilterLabelContainer>
              <SearchFilterLabel>
                {selectedChainFilterOption.toUpperCase()}
              </SearchFilterLabel>
            </SelectedChainFilterLabelContainer>
            <SearchFilterIconContainer>
              {!theme.dark ? (
                <CloseSvgLight width={10} height={10} />
              ) : (
                <CloseSvgDark width={10} height={10} />
              )}
            </SearchFilterIconContainer>
          </RowFilterContainer>
        </SelectedChainFilterContainer>
      ) : null}
      <SearchFilterContainer
        onPress={() => {
          dispatch(AppActions.showChainSelectorModal({}));
        }}>
        <RowFilterContainer>
          <SearchFilterLabelContainer>
            <SearchFilterLabel>{t('All Networks')}</SearchFilterLabel>
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
    </SearchRoundContainer>
  );
};

export default SearchComponent;
