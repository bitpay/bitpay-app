import React, {ReactElement, useState} from 'react';
import styled from 'styled-components/native';
import {AssetColumn, AssetImageContainer} from '../styled/Containers';
import {RowContainer} from '../styled/Containers';
import {H5, SubText} from '../styled/Text';
import haptic from '../haptic-feedback/haptic';
import Checkbox from '../checkbox/Checkbox';

export interface ItemProps {
  id: string | number;
  img: ReactElement;
  assetName: string;
  assetAbbreviation: string;
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

const AssetSelectorRow = ({item, emit}: Props) => {
  const {
    assetName,
    assetAbbreviation,
    img,
    checked: initialCheckValue,
    disabled,
  } = item;
  const [checked, setChecked] = useState(!!initialCheckValue);

  const toggle = (): void => {
    setChecked(!checked);
    haptic('impactLight');
    emit({
      asset: assetAbbreviation,
      checked: !checked,
    });
  };

  return (
    <RowContainer activeOpacity={1} onPress={toggle}>
      <AssetImageContainer>{img}</AssetImageContainer>
      <AssetColumn>
        <H5>{assetName}</H5>
        <SubText>{assetAbbreviation}</SubText>
      </AssetColumn>
      <CheckBoxContainer>
        <Checkbox checked={checked} disabled={disabled} onPress={toggle} />
      </CheckBoxContainer>
    </RowContainer>
  );
};

export default AssetSelectorRow;
