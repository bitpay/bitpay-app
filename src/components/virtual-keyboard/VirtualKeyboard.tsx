import React, {memo} from 'react';
import {TouchableOpacityProps} from 'react-native';
import styled, {css} from 'styled-components/native';
import DeleteSvg from '../../../assets/img/delete.svg';
import {SlateDark} from '../../styles/colors';
import {BaseText} from '../styled/Text';

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

export interface NumArray {
  val: string;
  letters: string;
}

export interface VirtualKeyboardProps {
  onCellPress?: ((value: string) => any) | undefined;
  showLetters?: boolean;
  showDot?: boolean;
}

interface CellProps extends Pick<VirtualKeyboardProps, 'onCellPress'> {
  value: string;
  letters?: string;
}

const Cell: React.FC<CellProps> = ({value, letters, onCellPress}) => {
  return (
    <CellContainer onPress={() => onCellPress?.(value)}>
      <CellValue>{value}</CellValue>
      {letters ? <CellLetter>{letters}</CellLetter> : null}
    </CellContainer>
  );
};

interface RowProps
  extends Pick<VirtualKeyboardProps, 'onCellPress' | 'showLetters'> {
  numArray: NumArray[];
}

const Row: React.FC<RowProps> = ({numArray, showLetters, onCellPress}) => {
  return (
    <RowContainer>
      {numArray
        ? numArray.map(cell => (
            <Cell
              onCellPress={onCellPress}
              value={cell.val}
              letters={showLetters ? cell.letters : undefined}
              key={cell.val}
            />
          ))
        : null}
    </RowContainer>
  );
};

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  onCellPress,
  showLetters = false,
  showDot = true,
}) => {
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
        showLetters={showLetters}
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
        showLetters={showLetters}
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
        showLetters={showLetters}
      />

      <RowContainer>
        <CellContainer onPress={() => onCellPress?.('.')}>
          {showDot && <CellValue>{'.'}</CellValue>}
        </CellContainer>
        <CellContainer onPress={() => onCellPress?.('0')}>
          <CellValue>{'0'}</CellValue>
        </CellContainer>
        <CellContainer
          onPress={() => onCellPress?.('backspace')}
          onLongPress={() => onCellPress?.('reset')}>
          <SymbolContainer showLetters={showLetters}>
            <DeleteSvg />
          </SymbolContainer>
        </CellContainer>
      </RowContainer>
    </KeyboardContainer>
  );
};

export default memo(VirtualKeyboard);
