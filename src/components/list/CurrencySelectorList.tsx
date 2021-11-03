import React, {ReactElement, useState} from 'react';
import styled from 'styled-components/native';
import {BitPay} from '../../styles/colors';
import {FlatList} from 'react-native';
import CheckBox from '@react-native-community/checkbox';
import {CurrencyImageContainer} from '../styled/Containers';
import Haptic from '../haptic-feedback/haptic';
import {
  ListContainer,
  RowContainer,
  RowDetailsContainer,
} from '../styled/Containers';
import {MainLabel, SecondaryLabel} from '../styled/Text';

interface ListProps {
  itemList?: Array<ItemProps>;
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
}

const CheckBoxContainer = styled.View`
  flex-direction: column;
  justify-content: center;
`;

const CurrencySelectorRow = ({item}: Props) => {
  const {mainLabel, secondaryLabel, img, checked, disabled} = item;
  const [toggleCheckBox, setToggleCheckBox] = useState(checked);

  return (
    <RowContainer>
      <CurrencyImageContainer>{img()}</CurrencyImageContainer>
      <RowDetailsContainer>
        <MainLabel>{mainLabel}</MainLabel>
        <SecondaryLabel>{secondaryLabel}</SecondaryLabel>
      </RowDetailsContainer>
      <CheckBoxContainer>
        <CheckBox
          disabled={disabled}
          value={toggleCheckBox}
          onValueChange={newValue => setToggleCheckBox(newValue)}
          tintColors={{true: BitPay, false: BitPay}}
          onChange={() => {
            Haptic('impactLight');
          }}
        />
      </CheckBoxContainer>
    </RowContainer>
  );
};

const CurrencySelectorList = ({itemList}: ListProps) => {
  return (
    <ListContainer>
      <FlatList
        data={itemList}
        renderItem={({item}) => (
          <CurrencySelectorRow item={item} id={item.id} />
        )}
      />
    </ListContainer>
  );
};

export default CurrencySelectorList;
