import React, {memo} from 'react';
import styled, {css, useTheme} from 'styled-components/native';
import {SlateDark, White} from '../../styles/colors';
import {BaseText} from '../styled/Text';
import DeleteIcon from '../icons/delete/Delete';
import VirtualKeyboardButtonAnimation from './VirtualKeyboardButtonAnimation';
import useAppSelector from '../../utils/hooks/useAppSelector';
import {isNarrowHeight} from '../styled/Containers';
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

export const getKeyboardSizes = (
  isSmallScreen?: boolean,
  context?: 'buyCrypto' | 'sellCrypto',
) => {
  let sizes = {
    cellValueFontSize: 32.08,
    cellValuelineHeight: 65,
    cellContainerHeight: 85,
    virtualKeyboardButtonSize: 85,
  };
  if (context && ['buyCrypto', 'sellCrypto'].includes(context)) {
    if (isSmallScreen) {
      sizes = {
        cellValueFontSize: 20,
        cellValuelineHeight: 30,
        cellContainerHeight: 45,
        virtualKeyboardButtonSize: 45,
      };
    } else {
      sizes = {
        cellValueFontSize: 25,
        cellValuelineHeight: 40,
        cellContainerHeight: 60,
        virtualKeyboardButtonSize: 60,
      };
    }
  } else {
    // Default case
    if (isSmallScreen) {
      sizes = {
        cellValueFontSize: 22,
        cellValuelineHeight: 35,
        cellContainerHeight: 60,
        virtualKeyboardButtonSize: 60,
      };
    }
  }
  return sizes;
};

const CellValue = styled(BaseText)<{
  darkModeOnly?: boolean;
  isSmallScreen?: boolean;
  context?: 'buyCrypto' | 'sellCrypto';
}>`
  font-size: ${({isSmallScreen, context}) =>
    getKeyboardSizes(isSmallScreen, context).cellValueFontSize}px;
  font-weight: 500;
  color: ${({theme, darkModeOnly}) =>
    darkModeOnly ? White : theme.colors.text};
  line-height: ${({isSmallScreen, context}) =>
    getKeyboardSizes(isSmallScreen, context).cellValuelineHeight}px;
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
  context?: 'buyCrypto' | 'sellCrypto';
}

interface CellProps extends Pick<VirtualKeyboardProps, 'onCellPress'> {
  value: string;
  letters?: string;
  backgroundColor: string;
  darkModeOnly?: boolean;
  context?: 'buyCrypto' | 'sellCrypto';
}

const Cell: React.FC<CellProps> = ({
  value,
  letters,
  onCellPress,
  backgroundColor,
  darkModeOnly,
  context,
}) => {
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const _isSmallScreen = showArchaxBanner ? true : isNarrowHeight;
  const accessibilityLabel = `${value}-button`;
  return (
    <CellContainer accessibilityLabel={accessibilityLabel}>
      <VirtualKeyboardButtonAnimation
        isSmallScreen={_isSmallScreen}
        onPress={() => onCellPress?.(value)}
        backgroundColor={backgroundColor}
        context={context}>
        <>
          <CellValue
            darkModeOnly={darkModeOnly}
            isSmallScreen={_isSmallScreen}
            context={context}>
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
  context?: 'buyCrypto' | 'sellCrypto';
}

const Row: React.FC<RowProps> = ({
  numArray,
  showLetters,
  onCellPress,
  backgroundColor,
  darkModeOnly,
  context,
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
              context={context}
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
  context,
}) => {
  const theme = useTheme();
  const backgroundColor =
    darkModeOnly || theme.dark
      ? 'rgba(255, 255, 255, 0.2)'
      : 'rgba(0, 0, 0, 0.1)';
  const bgColor = darkModeOnly || theme.dark ? White : '#4A4A4A';
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const _isSmallScreen = showArchaxBanner ? true : isNarrowHeight;
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
        context={context}
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
        context={context}
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
        context={context}
      />

      <RowContainer isSmallScreen={_isSmallScreen}>
        <CellContainer
          style={{
            height: getKeyboardSizes(_isSmallScreen, context)
              .cellContainerHeight,
          }}>
          {showDot ? (
            <VirtualKeyboardButtonAnimation
              onPress={() => onCellPress?.('.')}
              isSmallScreen={_isSmallScreen}
              backgroundColor={backgroundColor}
              context={context}>
              <CellValue
                darkModeOnly={darkModeOnly}
                isSmallScreen={_isSmallScreen}
                context={context}>
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
          context={context}
        />

        <CellContainer
          style={{
            height: getKeyboardSizes(_isSmallScreen, context)
              .cellContainerHeight,
          }}>
          <VirtualKeyboardButtonAnimation
            backgroundColor={backgroundColor}
            isSmallScreen={_isSmallScreen}
            context={context}
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
