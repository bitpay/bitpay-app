import React, {ReactElement, useState} from 'react';
import styled from 'styled-components/native';
import {FlatList} from 'react-native';
import {AssetImageContainer} from '../styled/Containers';
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
  emit: (value: {checked: boolean; asset: string}) => void;
}

export interface ItemProps {
  id: string | number;
  img: ReactElement;
  mainLabel: string;
  secondaryLabel: string;
  disabled?: boolean;
  checked?: boolean;
  roundIcon: (size?: number) => ReactElement;
}

interface Props {
  item: ItemProps;
  emit: (value: {checked: boolean; asset: string}) => void;
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

  const toggle = (): void => {
    setChecked(!checked);
    haptic('impactLight');
    emit({
      asset: secondaryLabel,
      checked: !checked,
    });
  };

  return (
    <RowContainer activeOpacity={1} onPress={toggle}>
      <AssetImageContainer>{img}</AssetImageContainer>
      <RowDetailsContainer>
        <MainLabel>{mainLabel}</MainLabel>
        <SecondaryLabel>{secondaryLabel}</SecondaryLabel>
      </RowDetailsContainer>
      <CheckBoxContainer>
        <Checkbox checked={checked} disabled={disabled} onPress={toggle} />
      </CheckBoxContainer>
    </RowContainer>
  );
};

const CurrencySelectorList = ({itemList, emit}: ListProps) => {
  return (
    <ListContainer>
      <FlatList
        contentContainerStyle={{paddingBottom: 100}}
        data={itemList}
        renderItem={({item}) => (
          <CurrencySelectorRow item={item} emit={emit} key={item.id} />
        )}
      />
    </ListContainer>
  );
};

export default CurrencySelectorList;
