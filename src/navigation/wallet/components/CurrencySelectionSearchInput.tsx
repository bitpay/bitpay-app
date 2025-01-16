import debounce from 'lodash.debounce';
import React, {useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useTheme} from 'styled-components/native';
import SearchIcon from '../../../../assets/img/search.svg';
import BoxInput, {IconContainer} from '../../../components/form/BoxInput';
import {ActiveOpacity} from '../../../components/styled/Containers';
import {NeutralSlate} from '../../../styles/colors';
import WalletIcons from './WalletIcons';

interface CurrencySelectionSearchInputProps {
  debounceWait?: number;
  onSearch?: (query: string) => any;
}

const CurrencySelectionSearchInput: React.FC<
  CurrencySelectionSearchInputProps
> = props => {
  const theme = useTheme();
  const {t} = useTranslation();
  const {debounceWait, onSearch} = props;
  const [query, setQuery] = useState('');
  const queryRef = useRef(query);
  queryRef.current = query;

  const placeHolderTextColor = theme.dark ? NeutralSlate : '#6F7782';

  const debouncedOnSearch = useMemo(() => {
    const fn = (text: string) => {
      onSearch?.(text);
    };

    if (!debounceWait) {
      return fn;
    }

    return debounce((text: string) => {
      if (queryRef.current) {
        fn(text);
      }
    }, debounceWait);
  }, [onSearch, debounceWait]);

  const onChangeText = useMemo(() => {
    return (text: string) => {
      setQuery(text);

      // if 2+ char, trigger debounced search
      // else if 1 char, do nothing
      // else if 0 char, clear search immediately
      if (!text) {
        onSearch?.(text);
      } else if (text.length > 1) {
        debouncedOnSearch(text);
      }
    };
  }, [setQuery, debouncedOnSearch, onSearch]);

  const onSearchPress = () => {
    // clear search immediately
    if (query) {
      setQuery('');
      onSearch?.('');
    }
  };

  return (
    <BoxInput
      placeholder={t('Search Currency')}
      placeholderTextColor={placeHolderTextColor}
      value={query}
      onChangeText={onChangeText}
      suffix={() => (
        <IconContainer activeOpacity={ActiveOpacity} onPress={onSearchPress}>
          {query ? <WalletIcons.Delete /> : <SearchIcon />}
        </IconContainer>
      )}
    />
  );
};

export default CurrencySelectionSearchInput;
