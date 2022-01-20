import React, {ReactElement, useState} from 'react';
import styled from 'styled-components/native';
import {CurrencyColumn, CurrencyImageContainer} from '../styled/Containers';
import {RowContainer} from '../styled/Containers';
import {H5, SubText} from '../styled/Text';
import haptic from '../haptic-feedback/haptic';
import Checkbox from '../checkbox/Checkbox';
import {ImageSourcePropType} from 'react-native';

export interface ItemProps {
  id: string | number;
  img: ReactElement;
  currencyName: string;
  currencyAbbreviation: string;
  disabled?: boolean;
  checked?: boolean;
  roundIcon: (size?: number) => ReactElement;
  imgSrc: ImageSourcePropType;
}

interface Props {
  item: ItemProps;
  emit: ({checked, currency}: {checked: boolean; currency: string}) => void;
}

const CheckBoxContainer = styled.View`
  flex-direction: column;
  justify-content: center;
`;

const CurrencySelectionRow = ({item, emit}: Props) => {
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
      currency: currencyAbbreviation,
      checked: !checked,
    });
  };

  return (
    <RowContainer activeOpacity={1} onPress={toggle}>
      <CurrencyImageContainer>{img}</CurrencyImageContainer>
      <CurrencyColumn>
        <H5>{currencyName}</H5>
        <SubText>{currencyAbbreviation}</SubText>
      </CurrencyColumn>
      <CheckBoxContainer>
        <Checkbox checked={checked} disabled={disabled} onPress={toggle} />
      </CheckBoxContainer>
    </RowContainer>
  );
};

export default CurrencySelectionRow;
