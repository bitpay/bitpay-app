import React, {memo} from 'react';
import styled, {css, useTheme} from 'styled-components/native';
import {SlateDark, White} from '../../styles/colors';
import {BaseText} from '../styled/Text';
import DeleteIcon from '../icons/delete/Delete';
import VirtualKeyboardButtonAnimation from './VirtualKeyboardButtonAnimation';
import useAppSelector from '../../utils/hooks/useAppSelector';
import {HEIGHT} from '../styled/Containers';
export const PIXEL_DENSITY_LIMIT = 2.5;

interface SymbolContainerProps {
  showLetters?: boolean;
}

const KeyboardContainer = styled.View<{isSmallScreen?: boolean}>`
  margin: ${({isSmallScreen}) => (isSmallScreen ? 5 : 10)}px 0;
`;

const RowContainer = styled.View<{isSmallScreen?: boolean}>`
  flex-direction: row;
  align-items: center;
  margin: 0;
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
  font-size: ${({isSmallScreen}) => (isSmallScreen ? 22 : 32.08)}px;
  font-weight: 500;
  color: ${({theme, darkModeOnly}) =>
    darkModeOnly ? White : theme.colors.text};
  line-height: ${({isSmallScreen}) => (isSmallScreen ? 35 : 65)}px;
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
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const _isSmallScreen = showArchaxBanner ? true : HEIGHT < 700;
  const accessibilityLabel = `${value}-button`;
  return (
    <CellContainer accessibilityLabel={accessibilityLabel}>
      <VirtualKeyboardButtonAnimation
        isSmallScreen={_isSmallScreen}
        onPress={() => onCellPress?.(value)}
        backgroundColor={backgroundColor}>
        <>
          <CellValue darkModeOnly={darkModeOnly} isSmallScreen={_isSmallScreen}>
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
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const _isSmallScreen = showArchaxBanner ? true : HEIGHT < 700;
  return (
    <KeyboardContainer isSmallScreen={_isSmallScreen}>
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

      <RowContainer isSmallScreen={_isSmallScreen}>
        <CellContainer>
          {showDot ? (
            <VirtualKeyboardButtonAnimation
              onPress={() => onCellPress?.('.')}
              isSmallScreen={_isSmallScreen}
              backgroundColor={backgroundColor}>
              <CellValue
                darkModeOnly={darkModeOnly}
                isSmallScreen={_isSmallScreen}>
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
            isSmallScreen={_isSmallScreen}
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
