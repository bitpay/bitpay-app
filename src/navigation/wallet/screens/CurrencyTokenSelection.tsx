import {StackScreenProps} from '@react-navigation/stack';
import debounce from 'lodash.debounce';
import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';
import CurrencySelectionRow, {
  CurrencySelectionItem,
  CurrencySelectionToggleProps,
} from '../../../components/list/CurrencySelectionRow';
import {HeaderTitle} from '../../../components/styled/Text';
import CurrencySelectionNoResults from '../components/CurrencySelectionNoResults';
import CurrencySelectionSearchInput from '../components/CurrencySelectionSearchInput';
import {WalletScreens, WalletStackParamList} from '../WalletStack';
import {
  CurrencySelectionContainer,
  ListContainer,
  SearchContainer,
} from './CurrencySelection';

export type CurrencyTokenSelectionScreenParamList = {
  currency: CurrencySelectionItem;
  tokens: CurrencySelectionItem[];
  onToggle: (args: CurrencySelectionToggleProps) => any;
};

const styles = StyleSheet.create({
  list: {
    paddingBottom: 100,
  },
});
const keyExtractor = (item: CurrencySelectionItem) => item.id;

const CurrencyTokenSelectionScreen: React.VFC<
  StackScreenProps<WalletStackParamList, WalletScreens.CURRENCY_TOKEN_SELECTION>
> = ({navigation, route}) => {
  const {t} = useTranslation();
  const {currency, tokens, onToggle} = route.params;
  const [items, setItems] = useState([currency, ...(tokens || [])]);
  const [searchInput, setSearchInput] = useState('');
  const searchInputRef = useRef(searchInput);
  searchInputRef.current = searchInput;
  const [searchFilter, setSearchFilter] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchFilter) {
      return items;
    }

    return items.reduce<CurrencySelectionItem[]>((accum, item) => {
      if (
        item.currencyAbbreviation.toLowerCase().includes(searchFilter) ||
        item.currencyName.toLowerCase().includes(searchFilter)
      ) {
        accum.push(item);
      }

      return accum;
    }, []);
  }, [searchFilter, items]);

  const debouncedSetSearchFilter = useMemo(
    () =>
      debounce((search: string) => {
        // after debouncing, if current search is null, ignore the previous search
        searchInputRef.current ? setSearchFilter(search.toLowerCase()) : null;
      }, 300),
    [],
  );

  const onTokenToggle = (tgt: CurrencySelectionToggleProps) => {
    setItems(prev =>
      prev.reduce<CurrencySelectionItem[]>((accum, token) => {
        if (token.id === tgt.id) {
          accum.push({
            ...token,
            selected: !token.selected,
          });
        } else {
          accum.push(token);
        }

        return accum;
      }, []),
    );
    onToggle(tgt);
  };

  const onToggleRef = useRef(onTokenToggle);
  onToggleRef.current = onTokenToggle;

  const memoizedOnToggle = useCallback((args: CurrencySelectionToggleProps) => {
    onToggleRef.current(args);
  }, []);

  const renderItem = useMemo(() => {
    return ({item}: {item: CurrencySelectionItem}) => {
      return (
        <CurrencySelectionRow
          key={item.id}
          currency={item}
          onToggle={memoizedOnToggle}
        />
      );
    };
  }, [memoizedOnToggle]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>
          {t('SelectArgCurrencies', {
            currency: t(currency.currencyName),
          })}
        </HeaderTitle>
      ),
    });
  }, [navigation, t, currency.currencyName]);

  return (
    <CurrencySelectionContainer>
      <SearchContainer>
        <CurrencySelectionSearchInput
          value={searchInput}
          onChangeText={text => {
            setSearchInput(text);

            // if 2+ char, filter search
            // else if 1 char, do nothing
            // else if 0 char, clear search immediately
            if (!text) {
              setSearchFilter(text);
            } else if (text.length > 1) {
              debouncedSetSearchFilter(text);
            }
          }}
          onSearchPress={search => {
            if (search) {
              setSearchInput('');
              setSearchFilter('');
            }
          }}
        />
      </SearchContainer>

      {filteredItems.length ? (
        <ListContainer>
          <FlatList<CurrencySelectionItem>
            contentContainerStyle={styles.list}
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
          />
        </ListContainer>
      ) : (
        <CurrencySelectionNoResults query={searchInput} />
      )}
    </CurrencySelectionContainer>
  );
};

export default CurrencyTokenSelectionScreen;
