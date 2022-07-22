import React, {memo, useState} from 'react';
import styled from 'styled-components/native';
import {IS_ANDROID} from '../../constants';
import {SupportedCurrencyOption} from '../../constants/SupportedCurrencyOptions';
import Checkbox from '../checkbox/Checkbox';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import haptic from '../haptic-feedback/haptic';
import {
  ActiveOpacity,
  CurrencyColumn,
  CurrencyImageContainer,
  RowContainer,
} from '../styled/Containers';
import {H5, ListItemSubText} from '../styled/Text';

export interface ItemProps extends SupportedCurrencyOption {
  disabled?: boolean;
  checked?: boolean;
  isToken?: boolean;
}

export interface CurrencySelectionToggleProps {
  id: string;
  checked: boolean;
  currencyAbbreviation: string;
  currencyName: string;
  isToken?: boolean;
}

interface CurrencySelectionRowProps {
  item: ItemProps;
  hideCheckbox?: boolean;
  onToggle?: (props: CurrencySelectionToggleProps) => void;
}

const CheckBoxContainer = styled.View`
  flex-direction: column;
  justify-content: center;
`;

const CurrencySelectionRow: React.VFC<CurrencySelectionRowProps> = ({
  item,
  hideCheckbox,
  onToggle,
}) => {
  const {
    id,
    currencyName,
    currencyAbbreviation,
    img,
    checked: initialCheckValue,
    disabled,
    isToken,
  } = item;

  const [checked, setChecked] = useState(!!initialCheckValue);
  const onPress = (): void => {
    setChecked(!checked);
    haptic(IS_ANDROID ? 'keyboardPress' : 'impactLight');
    onToggle?.({
      id,
      currencyAbbreviation,
      currencyName,
      checked: !checked,
      isToken,
    });
  };

  return (
    <RowContainer activeOpacity={ActiveOpacity} onPress={onPress}>
      <CurrencyImageContainer>
        <CurrencyImage img={img} />
      </CurrencyImageContainer>

      <CurrencyColumn>
        <H5>{currencyName}</H5>
        <ListItemSubText>{currencyAbbreviation}</ListItemSubText>
      </CurrencyColumn>

      {!hideCheckbox && (
        <CheckBoxContainer>
          <Checkbox checked={checked} disabled={disabled} onPress={onPress} />
        </CheckBoxContainer>
      )}
    </RowContainer>
  );
};

export default memo(CurrencySelectionRow);
