import React, {memo} from 'react';
import styled, {css, useTheme} from 'styled-components/native';
import {SlateDark, White} from '../../styles/colors';
import {BaseText} from '../styled/Text';
import DeleteIcon from '../icons/delete/Delete';

interface SymbolContainerProps {
  showLetters?: boolean;
}

const KeyboardContainer = styled.View`
  margin: 10px 0;
`;

const RowContainer = styled.View`
  flex-direction: row;
`;

const CellContainer = styled.View`
  width: 33.333333%;
  justify-content: center;
  align-items: center;
`;

const CellButton = styled.TouchableHighlight`
  height: 85px;
  width: 85px;
  justify-content: center;
  align-items: center;
  border-radius: 50px;
`;
const CellValue = styled(BaseText)<{darkModeOnly?: boolean}>`
  font-size: 32.08px;
  font-weight: 500;
  color: ${({theme, darkModeOnly}) =>
    darkModeOnly ? White : theme.colors.text};
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
  darkModeOnly?: boolean;
}

interface CellProps extends Pick<VirtualKeyboardProps, 'onCellPress'> {
  value: string;
  letters?: string;
  underlayColor: string;
  darkModeOnly?: boolean;
}

const Cell: React.FC<CellProps> = ({
  value,
  letters,
  onCellPress,
  underlayColor,
  darkModeOnly,
}) => {
  return (
    <CellContainer>
      <CellButton
        onPress={() => onCellPress?.(value)}
        underlayColor={underlayColor}>
        <>
          <CellValue darkModeOnly={darkModeOnly}>{value}</CellValue>
          {letters ? <CellLetter>{letters}</CellLetter> : null}
        </>
      </CellButton>
    </CellContainer>
  );
};

interface RowProps
  extends Pick<VirtualKeyboardProps, 'onCellPress' | 'showLetters'> {
  numArray: NumArray[];
  underlayColor: string;
  darkModeOnly?: boolean;
}

const Row: React.FC<RowProps> = ({
  numArray,
  showLetters,
  onCellPress,
  underlayColor,
  darkModeOnly,
}) => {
  return (
    <RowContainer>
      {numArray
        ? numArray.map(cell => (
            <Cell
              onCellPress={onCellPress}
              value={cell.val}
              letters={showLetters ? cell.letters : undefined}
              key={cell.val}
              underlayColor={underlayColor}
              darkModeOnly={darkModeOnly}
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
  darkModeOnly = false,
}) => {
  const theme = useTheme();
  const underlayColor =
    darkModeOnly || theme.dark
      ? 'rgba(255, 255, 255, 0.2)'
      : 'rgba(0, 0, 0, 0.1)';
  const bgColor = darkModeOnly || theme.dark ? White : '#4A4A4A';
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
        underlayColor={underlayColor}
        darkModeOnly={darkModeOnly}
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
        underlayColor={underlayColor}
        darkModeOnly={darkModeOnly}
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
        underlayColor={underlayColor}
        darkModeOnly={darkModeOnly}
      />

      <RowContainer>
        <CellContainer>
          {showDot ? (
            <CellButton
              onPress={() => onCellPress?.('.')}
              underlayColor={underlayColor}>
              <CellValue style={{lineHeight: 30}} darkModeOnly={darkModeOnly}>
                .
              </CellValue>
            </CellButton>
          ) : null}
        </CellContainer>
        <Cell
          onCellPress={() => onCellPress?.('0')}
          value={'0'}
          letters={undefined}
          underlayColor={underlayColor}
          darkModeOnly={darkModeOnly}
        />

        <CellContainer>
          <CellButton
            underlayColor={underlayColor}
            onPress={() => onCellPress?.('backspace')}
            onLongPress={() => onCellPress?.('reset')}>
            <SymbolContainer showLetters={showLetters}>
              <DeleteIcon bgColor={bgColor} />
            </SymbolContainer>
          </CellButton>
        </CellContainer>
      </RowContainer>
    </KeyboardContainer>
  );
};

export default memo(VirtualKeyboard);
