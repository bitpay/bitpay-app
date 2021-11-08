import React, {ReactElement, useState} from 'react';
import styled from 'styled-components/native';
import {FlatList} from 'react-native';
import {CurrencyImageContainer} from '../styled/Containers';
import {
  ListContainer,
  RowContainer,
  RowDetailsContainer,
} from '../styled/Containers';
import {MainLabel, SecondaryLabel} from '../styled/Text';
import haptic from '../haptic-feedback/haptic';
import Checkbox from '../checkbox/Checkbox';

interface ListProps {
  itemList?: Array<ItemProps>;
  emit: (checked: boolean) => void;
}

interface ItemProps {
  id: number;
  img: () => ReactElement;
  mainLabel?: string;
  secondaryLabel?: string;
  disabled?: boolean;
  checked?: boolean;
}

interface Props {
  id: number;
  item: ItemProps;
  emit: (checked: boolean) => void;
}

const CheckBoxContainer = styled.View`
  flex-direction: column;
  justify-content: center;
`;

const CurrencySelectorRow = ({item, emit}: Props) => {
  const {
    mainLabel,
    secondaryLabel,
    img,
    checked: initialCheckValue,
    disabled,
  } = item;
  const [checked, setChecked] = useState(!!initialCheckValue);

  return (
    <RowContainer>
      <CurrencyImageContainer>{img()}</CurrencyImageContainer>
      <RowDetailsContainer>
        <MainLabel>{mainLabel}</MainLabel>
        <SecondaryLabel>{secondaryLabel}</SecondaryLabel>
      </RowDetailsContainer>
      <CheckBoxContainer>
        <Checkbox
          checked={checked}
          disabled={disabled}
          onPress={(): void => {
            setChecked(!checked);
            haptic('impactLight');
            emit(checked);
          }}
        />
      </CheckBoxContainer>
    </RowContainer>
  );
};

const CurrencySelectorList = ({itemList, emit}: ListProps) => {
  return (
    <ListContainer>
      <FlatList
        data={itemList}
        renderItem={({item}) => (
          <CurrencySelectorRow item={item} id={item.id} emit={emit} />
        )}
      />
    </ListContainer>
  );
};

export default CurrencySelectorList;
