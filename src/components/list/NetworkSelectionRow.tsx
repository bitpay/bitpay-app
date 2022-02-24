import React, {memo} from 'react';
import {RowContainer} from '../styled/Containers';
import {H4} from '../styled/Text';

export interface NetworkSelectionProps {
  id: string;
  name: string;
}

interface Props {
  item: NetworkSelectionProps;
  emit: (props: NetworkSelectionProps) => void;
}

const NetworkSelectionRow = ({item, emit}: Props) => {
  const {id, name} = item;

  const toggle = (): void => {
    emit({
      id,
      name,
    });
  };

  return (
    <RowContainer activeOpacity={0.75} onPress={toggle}>
      <H4>{name}</H4>
    </RowContainer>
  );
};

export default memo(NetworkSelectionRow);
