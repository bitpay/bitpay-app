import React, {memo, useState} from 'react';
import styled from 'styled-components/native';
import {
  CurrencyColumn,
  CurrencyImageContainer,
  ActiveOpacity,
} from '../styled/Containers';
import {RowContainer} from '../styled/Containers';
import {H5, SubText} from '../styled/Text';
import haptic from '../haptic-feedback/haptic';
import Checkbox from '../checkbox/Checkbox';
import {SupportedCurrencyOption} from '../../constants/SupportedCurrencyOptions';
import {CurrencyImage} from '../currency-image/CurrencyImage';

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

interface Props {
  item: ItemProps;
  emit: (props: CurrencySelectionToggleProps) => void;
  removeCheckbox?: boolean;
}

const CheckBoxContainer = styled.View`
  flex-direction: column;
  justify-content: center;
`;

const CurrencySelectionRow = ({item, emit, removeCheckbox}: Props) => {
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
  const toggle = (): void => {
    setChecked(!checked);
    haptic('impactLight');
    emit({
      id,
      currencyAbbreviation,
      currencyName,
      checked: !checked,
      isToken,
    });
  };

  return (
    <RowContainer activeOpacity={ActiveOpacity} onPress={toggle}>
      <CurrencyImageContainer>
        <CurrencyImage img={img} />
      </CurrencyImageContainer>
      <CurrencyColumn>
        <H5>{currencyName}</H5>
        <SubText>{currencyAbbreviation}</SubText>
      </CurrencyColumn>
      {!removeCheckbox && (
        <CheckBoxContainer>
          <Checkbox checked={checked} disabled={disabled} onPress={toggle} />
        </CheckBoxContainer>
      )}
    </RowContainer>
  );
};

export default memo(CurrencySelectionRow);
