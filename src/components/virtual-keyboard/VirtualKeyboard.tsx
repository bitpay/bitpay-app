import React, {memo} from 'react';
import styled, {css} from 'styled-components/native';
import {BaseText} from '../styled/Text';
import DeleteSvg from '../../../assets/img/delete.svg';
import {SlateDark} from '../../styles/colors';

interface SymbolContainerProps {
  showLetters?: boolean;
}

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

const CellValue = styled(BaseText)`
  font-size: 32.08px;
  font-weight: 500;
  color: ${({theme}) => theme.colors.text};
  line-height: 65px;
`;

const CellLetter = styled(BaseText)`
  font-size: 10px;
  letter-spacing: 3px;
  color: ${SlateDark};
  top: -10px;
`;

const SymbolContainer = styled.View<SymbolContainerProps>`
  ${({showLetters}) =>
    showLetters &&
    css`
      margin-top: -13px;
    `};
`;

export interface numArray {
  val: string;
  letters: string;
}

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
      <Row
        numArray={[
          {
            val: '1',
            letters: '',
          },
          {
            val: '2',
            letters: 'ABC',
          },
          {
            val: '3',
            letters: 'DEF',
          },
        ]}
        onCellPress={onCellPress}
      />
      <Row
        numArray={[
          {
            val: '4',
            letters: 'GHI',
          },
          {
            val: '5',
            letters: 'JKL',
          },
          {
            val: '6',
            letters: 'MNO',
          },
        ]}
        onCellPress={onCellPress}
      />
      <Row
        numArray={[
          {
            val: '7',
            letters: 'PQRS',
          },
          {
            val: '8',
            letters: 'TUV',
          },
          {
            val: '9',
            letters: 'WXYZ',
          },
        ]}
        onCellPress={onCellPress}
      />

      <RowContainer>
        <CellContainer onPress={() => onCellPress('.')}>
          {showDot && <Cell val={'.'} />}
        </CellContainer>
        <CellContainer onPress={() => onCellPress('0')}>
          <Cell val={'0'} />
        </CellContainer>
        <CellContainer
          onPress={() => onCellPress('backspace')}
          onLongPress={() => onCellPress('reset')}>
          <SymbolContainer showLetters={showLetters}>
            <DeleteSvg />
          </SymbolContainer>
        </CellContainer>
      </RowContainer>
    </KeyboardContainer>
  );
};

export default VirtualKeyboard;
