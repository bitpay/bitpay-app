import {StackScreenProps} from '@react-navigation/stack';
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
import styled, {useTheme} from 'styled-components/native';
import {
  ChainSelectionRow,
  CurrencySelectionItem,
  CurrencySelectionToggleProps,
  DescriptionRow,
  TokenSelectionRow,
  TokensHeading,
} from '../../../components/list/CurrencySelectionRow';
import {ScreenGutter} from '../../../components/styled/Containers';
import {HeaderTitle} from '../../../components/styled/Text';
import {LightBlack, Slate30} from '../../../styles/colors';
import CurrencySelectionNoResults from '../components/CurrencySelectionNoResults';
import CurrencySelectionSearchInput from '../components/CurrencySelectionSearchInput';
import {WalletScreens, WalletStackParamList} from '../WalletStack';
import {CurrencySelectionContainer, SearchContainer} from './CurrencySelection';

export type CurrencyTokenSelectionScreenParamList = {
  currency: CurrencySelectionItem;
  tokens: CurrencySelectionItem[];
  description?: string;
  hideCheckbox?: boolean;
  onToggle: (args: CurrencySelectionToggleProps) => any;
};

const ListContainer = styled.View`
  flex-shrink: 1;
  padding-bottom: ${ScreenGutter};
`;

const styles = StyleSheet.create({
  list: {
    borderWidth: 1,
    marginLeft: 15,
    marginRight: 15,
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
  },
  listHeader: {
    marginBottom: 16,
  },
});

const keyExtractor = (item: CurrencySelectionItem) => item.id;

const CurrencyTokenSelectionScreen: React.VFC<
  StackScreenProps<WalletStackParamList, WalletScreens.CURRENCY_TOKEN_SELECTION>
> = ({navigation, route}) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const {params} = route;
  const [chain, setChain] = useState(params.currency);
  const [items, setItems] = useState(params.tokens);
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

  const onChainToggle = (tgt: CurrencySelectionToggleProps) => {
    setChain({
      ...chain,
      selected: !chain.selected,
    });
    params.onToggle(tgt);
  };

  const onChainToggleRef = useRef(onChainToggle);
  onChainToggleRef.current = onChainToggle;

  const memoizedOnChainToggle = useCallback(
    (args: CurrencySelectionToggleProps) => {
      onChainToggleRef.current(args);
    },
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
    params.onToggle(tgt);
  };

  const onTokenToggleRef = useRef(onTokenToggle);
  onTokenToggleRef.current = onTokenToggle;

  const memoizedOnTokenToggle = useCallback(
    (args: CurrencySelectionToggleProps) => {
      onTokenToggleRef.current(args);
    },
    [],
  );

  const listHeaderComponent = useMemo(() => {
    return () => (
      <>
        <ChainSelectionRow
          currency={chain}
          hideCheckbox={params.hideCheckbox}
          onToggle={memoizedOnChainToggle}
        />

        {params.description ? (
          <DescriptionRow>{params.description}</DescriptionRow>
        ) : null}

        <TokensHeading>
          {t('AllArgTokens', {currency: t(chain.currencyName)})}
        </TokensHeading>
      </>
    );
  }, [
    t,
    memoizedOnChainToggle,
    params.description,
    params.hideCheckbox,
    chain,
  ]);

  const renderItem = useMemo(() => {
    return ({item}: {item: CurrencySelectionItem}) => {
      return (
        <TokenSelectionRow
          key={item.id}
          chainImg={chain.img}
          token={item}
          hideCheckbox={params.hideCheckbox}
          onToggle={memoizedOnTokenToggle}
        />
      );
    };
  }, [memoizedOnTokenToggle, params.hideCheckbox, chain.img]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>
          {t('SelectArgCurrencies', {
            chain: t(chain.currencyName),
          })}
        </HeaderTitle>
      ),
    });
  }, [navigation, t, chain.currencyName]);

  return (
    <CurrencySelectionContainer>
      <SearchContainer>
        <CurrencySelectionSearchInput
          onSearch={setSearchFilter}
          debounceWait={300}
        />
      </SearchContainer>

      {filteredItems.length ? (
        <ListContainer>
          <FlatList<CurrencySelectionItem>
            contentContainerStyle={{
              ...styles.list,
              borderColor: theme.dark ? LightBlack : Slate30,
            }}
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={listHeaderComponent}
            ListHeaderComponentStyle={styles.listHeader}
          />
        </ListContainer>
      ) : (
        <CurrencySelectionNoResults query={searchFilter} />
      )}
    </CurrencySelectionContainer>
  );
};

export default CurrencyTokenSelectionScreen;
