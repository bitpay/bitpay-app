import React from 'react';
import {useTranslation} from 'react-i18next';
import {TextInputProps} from 'react-native';
import {useTheme} from 'styled-components';
import SearchIcon from '../../../../assets/img/search.svg';
import BoxInput, {IconContainer} from '../../../components/form/BoxInput';
import {ActiveOpacity} from '../../../components/styled/Containers';
import {NeutralSlate} from '../../../styles/colors';
import WalletIcons from './WalletIcons';

interface CurrencySelectionSearchInputProps
  extends Pick<TextInputProps, 'onChangeText' | 'value'> {
  onSearchPress?: (search: string | undefined) => any;
}

const CurrencySelectionSearchInput: React.VFC<
  CurrencySelectionSearchInputProps
> = props => {
  const theme = useTheme();
  const {t} = useTranslation();
  const {onChangeText, onSearchPress, value} = props;
  const placeHolderTextColor = theme.dark ? NeutralSlate : '#6F7782';

  return (
    <BoxInput
      placeholder={t('Search Currency')}
      placeholderTextColor={placeHolderTextColor}
      value={value}
      onChangeText={onChangeText}
      suffix={() => (
        <IconContainer
          activeOpacity={ActiveOpacity}
          onPress={() => onSearchPress?.(value)}>
          {value ? <WalletIcons.Delete /> : <SearchIcon />}
        </IconContainer>
      )}
    />
  );
};

export default CurrencySelectionSearchInput;
