import React, {useEffect, useState} from 'react';
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
  onChange: (value: string) => void;
  reset: string | undefined;
}

const VirtualKeyboard = ({onChange, reset}: VirtualKeyboardProps) => {
  const [curVal, setCurVal] = useState('');

  const onCellPress = (val: string) => {
    haptic('impactLight');
    let currentValue;
    switch (val) {
      case 'reset':
        currentValue = '';
        break;
      case 'backspace':
        currentValue = curVal.slice(0, -1);
        break;
      case '.':
        currentValue = curVal.includes('.') ? curVal : curVal + val;
        break;
      default:
        currentValue = curVal + val;
    }
    setCurVal(currentValue);
    onChange(currentValue);
  };

  useEffect(() => {
    if (reset) {
      onCellPress('reset');
    }
  }, [reset]);

  const Cell = ({val}: {val: string}) => {
    return (
      <CellContainer onPress={() => onCellPress(val)}>
        <CellText>{val}</CellText>
      </CellContainer>
    );
  };

  const Row = ({numArray}: {numArray: Array<string>}) => {
    return (
      <RowContainer>
        {numArray ? numArray.map(val => <Cell val={val} key={val} />) : null}
      </RowContainer>
    );
  };

  return (
    <KeyboardContainer>
      <Row numArray={['1', '2', '3']} />
      <Row numArray={['4', '5', '6']} />
      <Row numArray={['7', '8', '9']} />

      <RowContainer>
        <CellContainer onPress={() => onCellPress('.')}>
          <Cell val={'.'} />
        </CellContainer>
        <CellContainer onPress={() => onCellPress('0')}>
          <Cell val={'0'} />
        </CellContainer>
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
