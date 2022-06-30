import React, {memo, useState} from 'react';
import styled from 'styled-components/native';
import {ActiveOpacity, Column} from '../styled/Containers';
import {RowContainer} from '../styled/Containers';
import {H5, ListItemSubText} from '../styled/Text';
import haptic from '../haptic-feedback/haptic';
import Checkbox from '../checkbox/Checkbox';
import {Utxo} from '../../store/wallet/wallet.models';

export interface InputProps extends Utxo {
  checked?: boolean;
}

export interface InputSelectionToggleProps {
  checked: boolean;
  amount: number;
}

interface Props {
  item: InputProps;
  unitCode?: string;
  emit: (props: InputSelectionToggleProps) => void;
}

const CheckBoxContainer = styled.View`
  flex-direction: column;
  justify-content: center;
`;

const InputColumn = styled(Column)`
  margin-left: 16px;
`;

const InputSelectionRow = ({item, unitCode, emit}: Props) => {
  const {amount, address, checked: initialCheckValue} = item;

  const [checked, setChecked] = useState(!!initialCheckValue);
  const toggle = (): void => {
    setChecked(!checked);
    haptic('impactLight');
    emit({
      checked: !checked,
      amount,
    });
  };

  return (
    <RowContainer
      activeOpacity={ActiveOpacity}
      onPress={toggle}
      style={{paddingLeft: 0, paddingRight: 0}}>
      <CheckBoxContainer>
        <Checkbox checked={checked} onPress={toggle} />
      </CheckBoxContainer>
      <InputColumn>
        <H5>
          {amount} {unitCode?.toUpperCase()}{' '}
        </H5>
        <ListItemSubText numberOfLines={1} ellipsizeMode={'middle'}>
          {address}
        </ListItemSubText>
      </InputColumn>
    </RowContainer>
  );
};

export default memo(InputSelectionRow);
