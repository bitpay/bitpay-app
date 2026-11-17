import React, {ReactElement} from 'react';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {BaseText, H4, TextAlign} from '../../../components/styled/Text';
import {
  Image,
  ImageSourcePropType,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import {useTheme} from '../../../contexts';
import {
  ActiveOpacity,
  SheetContainer,
  SheetParams,
} from '../../../components/styled/Containers';
import {
  Black,
  Slate,
  Slate30,
  White,
  SlateDark,
  Feather,
  LightBlack,
} from '../../../styles/colors';
import {sleep} from '../../../utils/helper-methods';
import {
  TouchableOpacity,
  TouchableOpacityProps,
} from '@components/base/TouchableOpacity';
import Back from '../../../components/back/Back';
import AngleRight from '../../../../assets/img/angle-right.svg';

const styles = StyleSheet.create({
  optionsScroll: {
    flexGrow: 0,
  },
  optionsHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  optionsHeaderContainerCard: {
    marginBottom: 12,
  },
  optionsHeaderContainerDefault: {
    marginBottom: 25,
  },
  optionsHeaderTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  optionsHeaderPlaceholder: {
    width: 41,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  optionContainerTop: {
    paddingTop: 31,
  },
  optionContainerBottom: {
    paddingBottom: 31,
  },
  optionContainerCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  optionIconContainer: {
    justifyContent: 'center',
    width: 20,
  },
  optionTextContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexDirection: 'column',
    flex: 1,
  },
  optionTextContainerDefault: {
    marginHorizontal: 20,
  },
  optionTextContainerCard: {
    marginRight: 8,
  },
  optionTitleText: {
    fontStyle: 'normal',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 6,
  },
  optionTitleTextCard: {
    fontWeight: '500',
    lineHeight: 24,
  },
  optionDescriptionText: {
    fontStyle: 'normal',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  optionDescriptionTextCard: {
    fontSize: 16,
    lineHeight: 24,
  },
});

const OptionContainer: React.FC<
  TouchableOpacityProps &
    SheetParams & {
      cardStyle?: boolean;
      dark: boolean;
      style?: StyleProp<ViewStyle>;
    }
> = ({placement, cardStyle, dark, style, ...rest}) => (
  <TouchableOpacity
    style={[
      styles.optionContainer,
      cardStyle
        ? [
            styles.optionContainerCard,
            {backgroundColor: dark ? LightBlack : Feather},
          ]
        : placement === 'top'
        ? styles.optionContainerTop
        : styles.optionContainerBottom,
      style,
    ]}
    {...rest}
  />
);

export interface Option {
  img?: ReactElement;
  imgSrc?: ImageSourcePropType;
  cardStyle?: boolean;
  title?: string;
  description?: string;
  onPress: () => void;
  optionElement?: any;
  showChevron?: boolean;
}

type SheetPlacement = 'top' | 'bottom';

interface Props extends SheetParams {
  isVisible: boolean;
  closeModal: () => void;
  title?: string;
  titleStyle?: StyleProp<TextStyle>;
  onBack?: () => void;
  options: Array<Option>;
  placement?: SheetPlacement;
  paddingHorizontal?: number;
}

const OptionsSheet = ({
  isVisible,
  closeModal,
  title,
  titleStyle,
  onBack,
  options,
  paddingHorizontal,
}: Props) => {
  const theme = useTheme();
  const hasCardStyle = options.some(option => option.cardStyle);
  const sheetPlacement = 'bottom' as SheetPlacement;
  const topStyles = {
    paddingTop: Platform.OS === 'android' ? 0 : 31,
  };
  return (
    <SheetModal
      modalLibrary={'bottom-sheet'}
      isVisible={isVisible}
      onBackdropPress={closeModal}
      placement={sheetPlacement}>
      <SheetContainer
        placement={sheetPlacement}
        paddingHorizontal={paddingHorizontal}>
        {title ? (
          <View
            style={[
              styles.optionsHeaderContainer,
              hasCardStyle
                ? styles.optionsHeaderContainerCard
                : styles.optionsHeaderContainerDefault,
            ]}>
            {onBack ? (
              <TouchableOpacity onPress={onBack}>
                <Back opacity={1} />
              </TouchableOpacity>
            ) : (
              <View style={styles.optionsHeaderPlaceholder} />
            )}
            <View
              style={styles.optionsHeaderTitleContainer}
              pointerEvents="none">
              <TextAlign align={'center'}>
                <H4 style={titleStyle}>{title}</H4>
              </TextAlign>
            </View>
            <View style={styles.optionsHeaderPlaceholder} />
          </View>
        ) : null}
        <ScrollView style={styles.optionsScroll}>
          {options.map(
            (
              {
                img,
                imgSrc,
                title: optionTitle,
                description,
                cardStyle,
                onPress,
                optionElement,
                showChevron,
              },
              index,
            ) => {
              return (
                <OptionContainer
                  style={index === 0 && sheetPlacement === 'top' && topStyles}
                  placement={sheetPlacement}
                  cardStyle={cardStyle}
                  dark={theme.dark}
                  key={index}
                  activeOpacity={ActiveOpacity}
                  onPress={async () => {
                    closeModal();
                    await sleep(500);
                    onPress();
                  }}>
                  {optionElement ? (
                    <>{optionElement()}</>
                  ) : (
                    <>
                      {img && (
                        <View style={styles.optionIconContainer}>{img}</View>
                      )}
                      {imgSrc && (
                        <View style={styles.optionIconContainer}>
                          <Image source={imgSrc} />
                        </View>
                      )}
                      <View
                        style={[
                          styles.optionTextContainer,
                          cardStyle
                            ? styles.optionTextContainerCard
                            : styles.optionTextContainerDefault,
                        ]}>
                        {optionTitle ? (
                          <BaseText
                            style={[
                              styles.optionTitleText,
                              cardStyle && styles.optionTitleTextCard,
                              {color: theme.dark ? White : Black},
                            ]}>
                            {optionTitle}
                          </BaseText>
                        ) : null}
                        <BaseText
                          style={[
                            styles.optionDescriptionText,
                            cardStyle && styles.optionDescriptionTextCard,
                            {
                              color: cardStyle
                                ? theme.dark
                                  ? Slate30
                                  : SlateDark
                                : theme.dark
                                ? Slate
                                : Black,
                            },
                          ]}>
                          {description}
                        </BaseText>
                      </View>
                      {showChevron && (
                        <View style={styles.optionIconContainer}>
                          <AngleRight />
                        </View>
                      )}
                    </>
                  )}
                </OptionContainer>
              );
            },
          )}
        </ScrollView>
      </SheetContainer>
    </SheetModal>
  );
};

export default OptionsSheet;
