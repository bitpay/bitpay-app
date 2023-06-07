import React, {memo, useState} from 'react';
import styled from 'styled-components/native';
import {ActiveOpacity, Column} from '../styled/Containers';
import {RowContainer} from '../styled/Containers';
import {H5, ListItemSubText} from '../styled/Text';
import Checkbox from '../checkbox/Checkbox';
import {Utxo} from '../../store/wallet/wallet.models';

interface Props {
  item: Utxo;
  unitCode?: string;
  emit: (item: Utxo, index: number) => void;
  index: number;
}

const CheckBoxContainer = styled.View`
  flex-direction: column;
  justify-content: center;
`;

const InputColumn = styled(Column)`
  margin-left: 16px;
`;

const InputSelectionRow = ({item, unitCode, emit, index}: Props) => {
  const {amount, address, checked: initialCheckValue} = item;

  const [checked, setChecked] = useState(!!initialCheckValue);
  const toggle = (): void => {
    setChecked(!checked);
    emit({...item, ...{checked: !checked}}, index);
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
