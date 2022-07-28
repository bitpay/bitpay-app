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
import CurrencySelectionRow, {
  CurrencySelectionItem,
  CurrencySelectionToggleProps,
} from '../../../components/list/CurrencySelectionRow';
import {HeaderTitle} from '../../../components/styled/Text';
import {WalletScreens, WalletStackParamList} from '../WalletStack';

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

  const onTokenToggle = (tgt: CurrencySelectionToggleProps) => {
    setItems(prev =>
      prev.reduce<CurrencySelectionItem[]>((accum, token) => {
        accum.push(
          token.id === tgt.id
            ? {
                ...token,
                selected: !token.selected,
              }
            : token,
        );

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
  }, []);

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
    <>
      <FlatList<CurrencySelectionItem>
        contentContainerStyle={styles.list}
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
      />
    </>
  );
};

export default CurrencyTokenSelectionScreen;
