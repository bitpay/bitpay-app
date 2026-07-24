import React, {memo} from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../contexts';
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

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 0,
  },
  cellContainer: {
    width: '33.333333%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellLetter: {
    fontSize: 10,
    letterSpacing: 3,
    color: SlateDark,
    top: -10,
  },
});

export type KeyboardSizesContext = 'buyCrypto' | 'sellCrypto' | 'swapCrypto';

export const getKeyboardSizes = (
  isSmallScreen?: boolean,
  context?: KeyboardSizesContext,
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
  } else if (context === 'swapCrypto') {
    if (isSmallScreen) {
      sizes = {
        cellValueFontSize: 20,
        cellValuelineHeight: 30,
        cellContainerHeight: 45,
        virtualKeyboardButtonSize: 45,
      };
    } else {
      sizes = {
        cellValueFontSize: 27,
        cellValuelineHeight: 45,
        cellContainerHeight: 65,
        virtualKeyboardButtonSize: 65,
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

interface CellValueProps {
  darkModeOnly?: boolean;
  isSmallScreen?: boolean;
  context?: KeyboardSizesContext;
}

const CellValue: React.FC<
  CellValueProps & React.ComponentProps<typeof BaseText>
> = ({darkModeOnly, isSmallScreen, context, style, ...rest}) => {
  const theme = useTheme();
  const sizes = getKeyboardSizes(isSmallScreen, context);
  return (
    <BaseText
      style={[
        {
          fontSize: sizes.cellValueFontSize,
          fontWeight: '500',
          color: darkModeOnly ? White : theme.colors.text,
          lineHeight: sizes.cellValuelineHeight,
        },
        style,
      ]}
      {...rest}
    />
  );
};

const CellLetter: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => <BaseText style={[styles.cellLetter, style]} {...rest} />;

const SymbolContainer: React.FC<
  SymbolContainerProps & React.ComponentProps<typeof View>
> = ({showLetters, style, ...rest}) => (
  <View style={[showLetters ? {marginTop: -13} : null, style]} {...rest} />
);

export interface NumArray {
  val: string;
  letters: string;
}

export interface VirtualKeyboardProps {
  onCellPress?: ((value: string) => any) | undefined;
  showLetters?: boolean;
  showDot?: boolean;
  darkModeOnly?: boolean;
  context?: KeyboardSizesContext;
  isSmallScreen?: boolean;
}

interface CellProps
  extends Pick<VirtualKeyboardProps, 'onCellPress' | 'isSmallScreen'> {
  value: string;
  letters?: string;
  backgroundColor: string;
  darkModeOnly?: boolean;
  context?: KeyboardSizesContext;
}

const Cell: React.FC<CellProps> = ({
  value,
  letters,
  onCellPress,
  backgroundColor,
  darkModeOnly,
  context,
  isSmallScreen,
}) => {
  const accessibilityLabel = `${value}-button`;
  return (
    <View style={styles.cellContainer} accessibilityLabel={accessibilityLabel}>
      <VirtualKeyboardButtonAnimation
        isSmallScreen={isSmallScreen}
        onPress={() => onCellPress?.(value)}
        backgroundColor={backgroundColor}
        context={context}>
        <>
          <CellValue
            darkModeOnly={darkModeOnly}
            isSmallScreen={isSmallScreen}
            context={context}>
            {value}
          </CellValue>
          {letters ? <CellLetter>{letters}</CellLetter> : null}
        </>
      </VirtualKeyboardButtonAnimation>
    </View>
  );
};

interface RowProps
  extends Pick<
    VirtualKeyboardProps,
    'onCellPress' | 'showLetters' | 'isSmallScreen'
  > {
  numArray: NumArray[];
  backgroundColor: string;
  darkModeOnly?: boolean;
  context?: KeyboardSizesContext;
}

const Row: React.FC<RowProps> = ({
  numArray,
  showLetters,
  onCellPress,
  backgroundColor,
  darkModeOnly,
  context,
  isSmallScreen,
}) => {
  return (
    <View style={styles.rowContainer}>
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
              isSmallScreen={isSmallScreen}
            />
          ))
        : null}
    </View>
  );
};

type ResolvedVirtualKeyboardProps = Omit<
  VirtualKeyboardProps,
  'isSmallScreen'
> & {
  isSmallScreen: boolean;
};

const VirtualKeyboardContent: React.FC<ResolvedVirtualKeyboardProps> = ({
  onCellPress,
  showLetters = false,
  showDot = true,
  darkModeOnly = false,
  context,
  isSmallScreen,
}) => {
  const theme = useTheme();
  const backgroundColor =
    darkModeOnly || theme.dark
      ? 'rgba(255, 255, 255, 0.2)'
      : 'rgba(0, 0, 0, 0.1)';
  const bgColor = darkModeOnly || theme.dark ? White : '#4A4A4A';
  const _isSmallScreen = isSmallScreen;
  return (
    <View
      style={{marginVertical: _isSmallScreen ? 5 : 10, marginHorizontal: 0}}>
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
        isSmallScreen={_isSmallScreen}
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
        isSmallScreen={_isSmallScreen}
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
        isSmallScreen={_isSmallScreen}
      />

      <View style={styles.rowContainer}>
        <View
          style={[
            styles.cellContainer,
            {
              height: getKeyboardSizes(_isSmallScreen, context)
                .cellContainerHeight,
            },
          ]}>
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
        </View>
        <Cell
          onCellPress={onCellPress}
          value={'0'}
          letters={undefined}
          backgroundColor={backgroundColor}
          darkModeOnly={darkModeOnly}
          context={context}
          isSmallScreen={_isSmallScreen}
        />

        <View
          style={[
            styles.cellContainer,
            {
              height: getKeyboardSizes(_isSmallScreen, context)
                .cellContainerHeight,
            },
          ]}>
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
        </View>
      </View>
    </View>
  );
};

const StoreSizedVirtualKeyboard = memo(
  (props: Omit<VirtualKeyboardProps, 'isSmallScreen'>) => {
    const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);

    return (
      <VirtualKeyboardContent
        {...props}
        isSmallScreen={showArchaxBanner ? true : isNarrowHeight}
      />
    );
  },
);

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  isSmallScreen,
  ...rest
}) =>
  isSmallScreen === undefined ? (
    <StoreSizedVirtualKeyboard {...rest} />
  ) : (
    <VirtualKeyboardContent {...rest} isSmallScreen={isSmallScreen} />
  );

export default memo(VirtualKeyboard);
