import React from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../styled/Text';
import DeleteSvg from '../../../assets/img/delete.svg';
import haptic from '../haptic-feedback/haptic';

const KeyboardContainer = styled.View`
  margin: 10px 0;
`;

const RowContainer = styled.View`
  flex-direction: row;
`;

const CellContainer = styled.TouchableOpacity`
  width: 33.333333%;
  justify-content: center;
  align-items: center;
`;

const CellText = styled(BaseText)`
  font-size: 32.08px;
  font-weight: 500;
  color: ${({theme}) => theme.colors.text};
  line-height: 65px;
`;

export interface VirtualKeyboardProps {
  value: string;
  onChange: (value: string) => void;
}

interface CellProps {
  onPress: (value: string) => void;
  value: string;
}

const Cell: React.FC<CellProps> = ({value, onPress}) => {
  return (
    <CellContainer onPress={() => onPress(value)}>
      <CellText>{value}</CellText>
    </CellContainer>
  );
};

interface RowProps {
  numArray: string[];
  onCellPress: (value: string) => void;
}

const Row: React.FC<RowProps> = ({numArray, onCellPress}) => {
  return (
    <RowContainer>
      {numArray
        ? numArray.map(val => (
            <Cell onPress={onCellPress} value={val} key={val} />
          ))
        : null}
    </RowContainer>
  );
};

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({value, onChange}) => {
  const onCellPress = (val: string) => {
    haptic('impactLight');
    let currentValue;
    switch (val) {
      case 'reset':
        currentValue = '';
        break;
      case 'backspace':
        currentValue = value.slice(0, -1);
        break;
      case '.':
        currentValue = value.includes('.') ? value : value + val;
        break;
      default:
        currentValue = value === '0' ? val : value + val;
    }
    onChange(currentValue);
  };

  return (
    <KeyboardContainer>
      <Row numArray={['1', '2', '3']} onCellPress={onCellPress} />
      <Row numArray={['4', '5', '6']} onCellPress={onCellPress} />
      <Row numArray={['7', '8', '9']} onCellPress={onCellPress} />

      <RowContainer>
        <Cell onPress={onCellPress} value={'.'} />
        <Cell onPress={onCellPress} value={'0'} />
        <CellContainer
          onPress={() => onCellPress('backspace')}
          onLongPress={() => onCellPress('reset')}>
          <DeleteSvg />
        </CellContainer>
      </RowContainer>
    </KeyboardContainer>
  );
};

export default VirtualKeyboard;
