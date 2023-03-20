import React, {memo} from 'react';
import styled, {css, useTheme} from 'styled-components/native';
import {SlateDark, White} from '../../styles/colors';
import {BaseText} from '../styled/Text';
import DeleteIcon from '../icons/delete/Delete';
import {PixelRatio} from 'react-native';
import VirtualKeyboardButtonAnimation from './VirtualKeyboardButtonAnimation';
const PIXEL_DENSITY_LIMIT = 3;
export const VIRTUAL_KEYBOARD_BUTTON_SIZE =
  PixelRatio.get() < PIXEL_DENSITY_LIMIT ? 70 : 85;

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

const CellValue = styled(BaseText)<{
  darkModeOnly?: boolean;
  isSmallScreen?: boolean;
}>`
  font-size: ${({isSmallScreen}) => (isSmallScreen ? 26 : 32.08)}px;
  font-weight: 500;
  color: ${({theme, darkModeOnly}) =>
    darkModeOnly ? White : theme.colors.text};
  line-height: ${({isSmallScreen}) => (isSmallScreen ? 50 : 65)}px;
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
  backgroundColor: string;
  darkModeOnly?: boolean;
}

const Cell: React.FC<CellProps> = ({
  value,
  letters,
  onCellPress,
  backgroundColor,
  darkModeOnly,
}) => {
  const accessibilityLabel = `${value}-button`;
  console.log(accessibilityLabel);
  return (
    <CellContainer accessibilityLabel={accessibilityLabel}>
      <VirtualKeyboardButtonAnimation
        onPress={() => onCellPress?.(value)}
        backgroundColor={backgroundColor}>
        <>
          <CellValue
            darkModeOnly={darkModeOnly}
            isSmallScreen={PixelRatio.get() < PIXEL_DENSITY_LIMIT}>
            {value}
          </CellValue>
          {letters ? <CellLetter>{letters}</CellLetter> : null}
        </>
      </VirtualKeyboardButtonAnimation>
    </CellContainer>
  );
};

interface RowProps
  extends Pick<VirtualKeyboardProps, 'onCellPress' | 'showLetters'> {
  numArray: NumArray[];
  backgroundColor: string;
  darkModeOnly?: boolean;
}

const Row: React.FC<RowProps> = ({
  numArray,
  showLetters,
  onCellPress,
  backgroundColor,
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
              backgroundColor={backgroundColor}
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
  const backgroundColor =
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
        backgroundColor={backgroundColor}
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
        backgroundColor={backgroundColor}
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
        backgroundColor={backgroundColor}
        darkModeOnly={darkModeOnly}
      />

      <RowContainer>
        <CellContainer>
          {showDot ? (
            <VirtualKeyboardButtonAnimation
              onPress={() => onCellPress?.('.')}
              backgroundColor={backgroundColor}>
              <CellValue style={{lineHeight: 30}} darkModeOnly={darkModeOnly}>
                .
              </CellValue>
            </VirtualKeyboardButtonAnimation>
          ) : null}
        </CellContainer>
        <Cell
          onCellPress={() => onCellPress?.('0')}
          value={'0'}
          letters={undefined}
          backgroundColor={backgroundColor}
          darkModeOnly={darkModeOnly}
        />

        <CellContainer>
          <VirtualKeyboardButtonAnimation
            backgroundColor={backgroundColor}
            onLongPress={() => onCellPress?.('reset')}
            onPress={() => onCellPress?.('backspace')}>
            <SymbolContainer showLetters={showLetters}>
              <DeleteIcon bgColor={bgColor} />
            </SymbolContainer>
          </VirtualKeyboardButtonAnimation>
        </CellContainer>
      </RowContainer>
    </KeyboardContainer>
  );
};

export default memo(VirtualKeyboard);
