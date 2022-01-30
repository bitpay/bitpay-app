import React, {memo, useState} from 'react';
import styled from 'styled-components/native';
import {CurrencyColumn, CurrencyImageContainer} from '../styled/Containers';
import {RowContainer} from '../styled/Containers';
import {H5, SubText} from '../styled/Text';
import haptic from '../haptic-feedback/haptic';
import Checkbox from '../checkbox/Checkbox';
import {SupportedCurrencyOption} from '../../constants/SupportedCurrencyOptions';
import {CurrencyImage} from '../currency-image/CurrencyImage';

export interface ItemProps extends SupportedCurrencyOption {
  disabled?: boolean;
  checked?: boolean;
}

export interface CurrencySelectionToggleProps {
  checked: boolean;
  currencyAbbreviation: string;
  currencyName: string;
}

interface Props {
  item: ItemProps;
  emit: ({
    checked,
    currencyAbbreviation,
    currencyName,
  }: CurrencySelectionToggleProps) => void;
  removeCheckbox?: boolean;
}

const CheckBoxContainer = styled.View`
  flex-direction: column;
  justify-content: center;
`;

const CurrencySelectionRow = ({item, emit, removeCheckbox}: Props) => {
  const {
    currencyName,
    currencyAbbreviation,
    img,
    checked: initialCheckValue,
    disabled,
  } = item;
  const [checked, setChecked] = useState(!!initialCheckValue);

  const toggle = (): void => {
    setChecked(!checked);
    haptic('impactLight');
    emit({
      currencyAbbreviation,
      currencyName,
      checked: !checked,
    });
  };

  return (
    <RowContainer activeOpacity={0.75} onPress={toggle}>
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
