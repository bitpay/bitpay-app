import React from 'react';
import {
  Dimensions,
  Text,
  Platform,
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity as RNTouchableOpacity,
  ViewStyle,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../contexts';
import {
  Feather,
  LightBlack,
  LightBlue,
  NeutralSlate,
  SlateDark,
  White,
  Slate,
  NotificationPrimary,
  Action,
  LuckySevens,
  Slate30,
  Black,
  Success25,
  LinkBlue,
  Caution,
} from '../../styles/colors';
import {BaseText} from './Text';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
export {ActiveOpacity} from '@components/base/TouchableOpacity';

export const {height: HEIGHT, width: WIDTH} = Dimensions.get('window');
export const isNotMobile = HEIGHT / WIDTH < 1.6;
export const isNarrowHeight = HEIGHT < 700;
export const CTA_RESERVED = 104;

export const ScreenGutter = '12px';

const phase0Styles = StyleSheet.create({
  imageContainer: {
    marginVertical: 10,
    marginHorizontal: 0,
    display: 'flex',
  },
  titleContainer: {
    width: WIDTH * 0.75,
  },
  textContainer: {
    marginTop: 10,
    padding: 10,
    width: WIDTH * 0.9,
  },
  ctaContainer: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: 'stretch',
    flexDirection: 'column',
    marginTop: 30,
  },
  actionContainer: {
    marginVertical: 5,
    marginHorizontal: 0,
  },
});

interface ImageContainerProps {
  justifyContent?: string;
}

export const ImageContainer = React.forwardRef<
  View,
  ImageContainerProps & React.ComponentProps<typeof View>
>(({justifyContent, style, ...rest}, ref) => (
  <View
    ref={ref}
    style={[
      phase0Styles.imageContainer,
      {justifyContent: (justifyContent || 'center') as any},
      style,
    ]}
    {...rest}
  />
));
ImageContainer.displayName = 'ImageContainer';

export const TitleContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[phase0Styles.titleContainer, style]} {...rest} />
));
TitleContainer.displayName = 'TitleContainer';

export const TextContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[phase0Styles.textContainer, style]} {...rest} />
));
TextContainer.displayName = 'TextContainer';

export const CtaContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[phase0Styles.ctaContainer, style]} {...rest} />
));
CtaContainer.displayName = 'CtaContainer';

export const ActionContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[phase0Styles.actionContainer, style]} {...rest} />
));
ActionContainer.displayName = 'ActionContainer';

const styles = StyleSheet.create({
  headerRightContainer: {height: 40},
  headerTitleContainer: {marginTop: 10, padding: 10},
  screenContainer: {flex: 1},
  subTextContainer: {width: WIDTH * 0.8, marginTop: 10},
  ctaContainerAbsoluteBase: {
    padding: 15,
    position: 'absolute',
    paddingBottom: 10,
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  hr: {borderBottomWidth: 1},
  column: {flex: 1, flexDirection: 'column'},
  row: {flex: 1, flexDirection: 'row'},
  listContainer: {flex: 1},
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginVertical: 0,
    marginHorizontal: 6,
  },
  rowContainerWithoutBorders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  rowContainerWithoutFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginVertical: 0,
    marginHorizontal: 10,
  },
  currencyColumn: {marginLeft: 8, gap: 2},
  currencyImageContainer: {
    height: 50,
    width: 50,
    display: 'flex',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 8,
    marginRight: 3,
  },
  cardContainer: {borderRadius: 12, overflow: 'hidden'},
  sheetContainer: {
    paddingVertical: 30,
    justifyContent: 'center',
    alignContent: 'center',
    maxHeight: HEIGHT - 100,
  },
  setting: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    height: 58,
    paddingLeft: 15,
    paddingRight: 15,
  },
  settingTitle: {
    flexGrow: 1,
    flexShrink: 1,
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '400',
    letterSpacing: 0,
    textAlign: 'left',
    marginRight: 5,
  },
  settingDescription: {fontSize: 14},
  settingView: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 58,
  },
  info: {borderRadius: 8, padding: 15, marginBottom: 15},
  infoTriangle: {
    width: 12,
    height: 12,
    position: 'absolute',
    top: -12,
    left: 20,
    borderLeftWidth: 12,
    borderLeftColor: 'transparent',
    borderRightWidth: 12,
    borderRightColor: 'transparent',
    borderBottomWidth: 12,
  },
  advancedOptionsContainer: {
    borderRadius: 6,
    marginBottom: 20,
    marginTop: 10,
  },
  advancedOptionsButton: {
    height: 60,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 6,
  },
  advancedOptionsButtonText: {fontSize: 16, lineHeight: 25},
  advancedOptions: {borderStyle: 'solid', borderTopWidth: 1},
  importContainer: {paddingVertical: 10, paddingHorizontal: 0},
  importTextInput: {
    height: 80,
    borderWidth: 0.75,
    borderColor: Slate,
    borderTopRightRadius: 4,
    borderTopLeftRadius: 4,
    textAlignVertical: 'top',
    padding: 5,
    fontSize: 16,
  },
  scanContainer: {
    height: 25,
    width: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    paddingTop: 20,
    paddingRight: 0,
    paddingBottom: 10,
    paddingLeft: 0,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionContainer: {flex: 1},
  optionListContainer: {flex: 1, paddingHorizontal: 12, marginTop: 30},
  optionList: {
    height: 'auto',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  optionInfoContainer: {padding: 20, justifyContent: 'center', flex: 1},
  searchContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#9ba3ae',
    alignItems: 'center',
    borderTopRightRadius: 4,
    borderTopLeftRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 0,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    height: 32,
    backgroundColor: 'transparent',
  },
  searchRoundContainer: {
    flexDirection: 'row',
    display: 'flex',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 100,
    alignItems: 'center',
    height: 50,
  },
  searchRoundInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 16,
    fontWeight: '400',
  },
  hiddenContainer: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 40,
  },
  copyToClipboardContainer: {
    borderWidth: 1,
    borderColor: '#9ba3ae',
    borderRadius: 4,
    paddingHorizontal: 10,
    height: 55,
    alignItems: 'center',
    flexDirection: 'row',
  },
  copyImgContainer: {
    borderRightWidth: 1,
    paddingRight: 10,
    height: 25,
    justifyContent: 'center',
  },
  noResultsContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: HEIGHT - 300,
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  noResultsImgContainer: {paddingBottom: 40},
  noResultsDescription: {fontSize: 16},
  proposalBadgeContainer: {
    backgroundColor: Action,
    borderRadius: 10,
    height: 30,
    width: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    padding: 4,
    borderRadius: 2.4,
    gap: 4,
    height: 22,
  },
  badgeContainerTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    padding: 4,
    borderRadius: 2.4,
    gap: 4,
    height: 20,
  },
  emptyListContainer: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 50,
  },
  chevronContainerTouchable: {
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
    height: 20,
    width: 20,
  },
  chevronContainer: {
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
    height: 20,
    width: 20,
  },
  accountChainsContainer: {
    flexDirection: 'row',
    flexShrink: 1,
    alignItems: 'center',
    gap: 10,
    borderRadius: 50,
  },
  sellTxIconBadge: {position: 'absolute', right: 0, bottom: 0},
  closeButtonContainer: {
    margin: 'auto' as any,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tssqrSectionContainer: {borderRadius: 12, height: 390},
  tssqrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: White,
    borderRadius: 12,
    margin: 16,
  },
  tssShareContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  tssShareButtonText: {fontSize: 16, fontWeight: '500', marginLeft: 8},
  tssStepsSection: {paddingVertical: 24, paddingHorizontal: 12},
  tssStepsContainer: {padding: 16, borderRadius: 12, borderWidth: 1},
  tssStepRow: {flexDirection: 'row', alignItems: 'flex-start'},
  tssStepRowWithButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  tssStepContentWithButton: {flex: 1, paddingBottom: 20, paddingRight: 8},
  tssStepRail: {width: 40, alignItems: 'center', marginRight: 12},
  tssStepIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tssStepConnector: {width: 2, flexGrow: 1, marginTop: 0},
  tssStepContent: {flex: 1, paddingBottom: 20},
  tssContinuePillButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 50,
    backgroundColor: Action,
    alignSelf: 'flex-start',
    marginTop: 2,
    gap: 8,
  },
  tssContinuePillText: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    color: White,
  },
  tssInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  tssStyledInput: {flex: 1, fontSize: 16, padding: 0},
  tssErrorText: {color: Caution, fontSize: 14, marginBottom: 12},
  tssStepsSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 30,
  },
  tssStepNumber: {fontSize: 16, fontWeight: '400'},
  tssStepTitle: {fontSize: 16, fontWeight: '500', lineHeight: 24},
  tssStepSubtitle: {fontSize: 13, fontWeight: '400', lineHeight: 20},
  tssStatusText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 10,
    lineHeight: 24,
  },
  tssStatusSubText: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 4,
    lineHeight: 20,
  },
});

// Nav
export const HeaderRightContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.headerRightContainer, style]} {...rest} />
));
HeaderRightContainer.displayName = 'HeaderRightContainer';

export const HeaderTitleContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.headerTitleContainer, style]} {...rest} />
));
HeaderTitleContainer.displayName = 'HeaderTitleContainer';

export const ScreenContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.screenContainer, style]} {...rest} />
));
ScreenContainer.displayName = 'ScreenContainer';

export const SubTextContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.subTextContainer, style]} {...rest} />
));
SubTextContainer.displayName = 'SubTextContainer';

interface CtaContainerAbsoluteBaseProps {
  background?: boolean;
}

const CtaContainerAbsoluteBase = React.forwardRef<
  View,
  CtaContainerAbsoluteBaseProps & React.ComponentProps<typeof View>
>(({background, style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.ctaContainerAbsoluteBase,
        background ? {backgroundColor: theme.colors.background} : null,
        style,
      ]}
      {...rest}
    />
  );
});
CtaContainerAbsoluteBase.displayName = 'CtaContainerAbsoluteBase';

export const CtaContainerAbsolute = React.forwardRef<
  React.ElementRef<typeof CtaContainerAbsoluteBase>,
  React.ComponentProps<typeof CtaContainerAbsoluteBase>
>((props, ref) => {
  const insets = useSafeAreaInsets();
  const paddingBottom = Platform.OS === 'ios' ? insets.bottom : 10;
  const {style, ...rest} = props;
  return (
    <CtaContainerAbsoluteBase
      ref={ref}
      {...rest}
      style={[{paddingBottom}, style]}
    />
  );
});
CtaContainerAbsolute.displayName = 'CtaContainerAbsolute';

export const Br: React.FC = () => <Text />;

export const Hr = React.forwardRef<View, React.ComponentProps<typeof View>>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <View
        ref={ref}
        style={[
          styles.hr,
          {borderBottomColor: theme.dark ? LightBlack : '#ebecee'},
          style,
        ]}
        {...rest}
      />
    );
  },
);
Hr.displayName = 'Hr';

export const Column = React.forwardRef<View, React.ComponentProps<typeof View>>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.column, style]} {...rest} />
  ),
);
Column.displayName = 'Column';

export const Row = React.forwardRef<View, React.ComponentProps<typeof View>>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.row, style]} {...rest} />
  ),
);
Row.displayName = 'Row';

// LIST
export const ListContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.listContainer, style]} {...rest} />
));
ListContainer.displayName = 'ListContainer';

interface RowContainerProps {
  isLast?: boolean;
  noBorder?: boolean;
  isDisabled?: boolean;
}

export const RowContainer: React.FC<
  RowContainerProps & React.ComponentProps<typeof TouchableOpacity>
> = ({isLast, noBorder, isDisabled, style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.rowContainer,
        {
          borderBottomColor: theme.dark ? LightBlack : LightBlue,
          borderBottomWidth: isLast || noBorder ? 0 : 1,
          opacity: isDisabled ? 0.5 : 1,
        },
        style,
      ]}
      {...rest}
    />
  );
};

export const RowContainerWithoutBorders: React.FC<
  RowContainerProps & React.ComponentProps<typeof TouchableOpacity>
> = ({
  isLast: _isLast,
  noBorder: _noBorder,
  isDisabled: _isDisabled,
  style,
  ...rest
}) => (
  <TouchableOpacity
    style={[styles.rowContainerWithoutBorders, style]}
    {...rest}
  />
);

export const RowContainerWithoutFeedback = React.forwardRef<
  View,
  RowContainerProps & React.ComponentProps<typeof View>
>(
  (
    {isLast, noBorder: _noBorder, isDisabled: _isDisabled, style, ...rest},
    ref,
  ) => {
    const theme = useTheme();
    return (
      <View
        ref={ref}
        style={[
          styles.rowContainerWithoutFeedback,
          {
            borderBottomColor: theme.dark ? LightBlack : LightBlue,
            borderBottomWidth: isLast ? 0 : 1,
          },
          style,
        ]}
        {...rest}
      />
    );
  },
);
RowContainerWithoutFeedback.displayName = 'RowContainerWithoutFeedback';

export const CurrencyColumn = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View
    ref={ref}
    style={[styles.column, styles.currencyColumn, style]}
    {...rest}
  />
));
CurrencyColumn.displayName = 'CurrencyColumn';

export const CurrencyImageContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.currencyImageContainer, style]} {...rest} />
));
CurrencyImageContainer.displayName = 'CurrencyImageContainer';

// Card
export const CardGutter = '15px';

export const CardContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.cardContainer,
        {backgroundColor: theme.dark ? LightBlack : White},
        style,
      ]}
      {...rest}
    />
  );
});
CardContainer.displayName = 'CardContainer';

export interface SheetParams {
  placement?: 'top' | 'bottom';
  paddingHorizontal?: number;
}

export const SheetContainer = React.forwardRef<
  View,
  SheetParams & React.ComponentProps<typeof View>
>(({placement, paddingHorizontal, style, ...rest}, ref) => {
  const theme = useTheme();
  const topPlacement = placement === 'top';
  return (
    <View
      ref={ref}
      style={[
        styles.sheetContainer,
        {
          paddingHorizontal: paddingHorizontal === 0 ? 0 : 30,
          backgroundColor: theme.dark ? LightBlack : White,
          borderTopLeftRadius: topPlacement ? 0 : 17,
          borderTopRightRadius: topPlacement ? 0 : 17,
          borderBottomLeftRadius: topPlacement ? 17 : 0,
          borderBottomRightRadius: topPlacement ? 17 : 0,
        },
        style,
      ]}
      {...rest}
    />
  );
});
SheetContainer.displayName = 'SheetContainer';

// Settings List
export const Setting: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.setting, style]} {...rest} />
);

export const SettingTitle = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[styles.settingTitle, {color: theme.colors.text}, style]}
      {...rest}
    />
  );
});
SettingTitle.displayName = 'SettingTitle';

export const SettingDescription = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.settingDescription,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
SettingDescription.displayName = 'SettingDescription';

interface SettingIconProps {
  prefix?: boolean;
  suffix?: boolean;
}

export const SettingIcon = React.forwardRef<
  View,
  SettingIconProps & React.ComponentProps<typeof View>
>(({prefix, suffix, style, ...rest}, ref) => (
  <View
    ref={ref}
    style={[
      prefix ? {marginRight: 12} : null,
      suffix ? {marginLeft: 12} : null,
      style,
    ]}
    {...rest}
  />
));
SettingIcon.displayName = 'SettingIcon';

export const SettingView = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.settingView, style]} {...rest} />
));
SettingView.displayName = 'SettingView';

// Info
export const Info = React.forwardRef<View, React.ComponentProps<typeof View>>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <View
        ref={ref}
        style={[
          styles.info,
          {backgroundColor: theme.dark ? SlateDark : '#f8f9fe'},
          style,
        ]}
        {...rest}
      />
    );
  },
);
Info.displayName = 'Info';

export const InfoTriangle = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.infoTriangle,
        {borderBottomColor: theme.dark ? SlateDark : '#f8f9fe'},
        style,
      ]}
      {...rest}
    />
  );
});
InfoTriangle.displayName = 'InfoTriangle';

export const AdvancedOptionsContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.advancedOptionsContainer,
        {backgroundColor: theme.dark ? LightBlack : Feather},
        style,
      ]}
      {...rest}
    />
  );
});
AdvancedOptionsContainer.displayName = 'AdvancedOptionsContainer';

export const AdvancedOptionsButton: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.advancedOptionsButton,
        {backgroundColor: theme.dark ? LightBlack : Feather},
        style,
      ]}
      {...rest}
    />
  );
};

export const AdvancedOptionsButtonText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.advancedOptionsButtonText,
        {color: theme.dark ? White : NotificationPrimary},
        style,
      ]}
      {...rest}
    />
  );
});
AdvancedOptionsButtonText.displayName = 'AdvancedOptionsButtonText';

export const AdvancedOptions = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.advancedOptions,
        {borderTopColor: theme.dark ? SlateDark : Slate30},
        style,
      ]}
      {...rest}
    />
  );
});
AdvancedOptions.displayName = 'AdvancedOptions';

export const ImportContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.importContainer, style]} {...rest} />
));
ImportContainer.displayName = 'ImportContainer';

export const ImportTextInput = React.forwardRef<
  TextInput,
  React.ComponentProps<typeof TextInput>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <TextInput
      ref={ref}
      style={[
        styles.importTextInput,
        {color: theme.colors.text, backgroundColor: theme.colors.background},
        style,
      ]}
      {...rest}
    />
  );
});
ImportTextInput.displayName = 'ImportTextInput';

interface InfoImageContainerProps {
  infoMargin: string;
}

export const InfoImageContainer = React.forwardRef<
  View,
  InfoImageContainerProps & React.ComponentProps<typeof View>
>(({infoMargin, style, ...rest}, ref) => (
  <View ref={ref} style={[parseCssMargin(infoMargin), style]} {...rest} />
));
InfoImageContainer.displayName = 'InfoImageContainer';

export const ScanContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.scanContainer, style]} {...rest} />
);

export const HeaderContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.headerContainer, style]} {...rest} />
));
HeaderContainer.displayName = 'HeaderContainer';

// creation and add wallet
export const OptionContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.optionContainer, style]} {...rest} />
));
OptionContainer.displayName = 'OptionContainer';

export const OptionListContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.optionListContainer, style]} {...rest} />
));
OptionListContainer.displayName = 'OptionListContainer';

export const OptionList: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.optionList,
        {backgroundColor: theme.dark ? LightBlack : Feather},
        style,
      ]}
      {...rest}
    />
  );
};

export const OptionInfoContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.optionInfoContainer, style]} {...rest} />
));
OptionInfoContainer.displayName = 'OptionInfoContainer';

export const SearchContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.searchContainer, style]} {...rest} />
));
SearchContainer.displayName = 'SearchContainer';

export const SearchInput = React.forwardRef<
  TextInput,
  React.ComponentProps<typeof TextInput>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <TextInput
      ref={ref}
      style={[
        styles.searchInput,
        {
          borderRightColor: theme.dark ? '#45484E' : LightBlue,
          color: theme.colors.text,
        },
        style,
      ]}
      {...rest}
    />
  );
});
SearchInput.displayName = 'SearchInput';

// Search Round
export const SearchRoundContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.searchRoundContainer,
        {borderColor: theme.dark ? SlateDark : Slate30},
        style,
      ]}
      {...rest}
    />
  );
});
SearchRoundContainer.displayName = 'SearchRoundContainer';

export const SearchRoundInput = React.forwardRef<
  TextInput,
  React.ComponentProps<typeof TextInput>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <TextInput
      ref={ref}
      style={[
        styles.searchRoundInput,
        {color: theme.dark ? Slate : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
SearchRoundInput.displayName = 'SearchRoundInput';

export const HiddenContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.hiddenContainer,
        {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
        style,
      ]}
      {...rest}
    />
  );
});
HiddenContainer.displayName = 'HiddenContainer';

export const CopyToClipboardContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity
    style={[styles.copyToClipboardContainer, style]}
    {...rest}
  />
);
CopyToClipboardContainer.displayName = 'CopyToClipboardContainer';

export const CopyImgContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.copyImgContainer,
        {borderRightColor: theme.dark ? '#46494E' : LightBlue},
        style,
      ]}
      {...rest}
    />
  );
});
CopyImgContainer.displayName = 'CopyImgContainer';

// Search box no result
export const NoResultsContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.noResultsContainer, style]} {...rest} />
));
NoResultsContainer.displayName = 'NoResultsContainer';

export const NoResultsImgContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.noResultsImgContainer, style]} {...rest} />
));
NoResultsImgContainer.displayName = 'NoResultsImgContainer';

export const NoResultsDescription = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.noResultsDescription, style]} {...rest} />
));
NoResultsDescription.displayName = 'NoResultsDescription';

export const ProposalBadgeContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.proposalBadgeContainer, style]} {...rest} />
);

export const BadgeContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.badgeContainer,
        {borderColor: theme.dark ? LuckySevens : Slate30},
        style,
      ]}
      {...rest}
    />
  );
});
BadgeContainer.displayName = 'BadgeContainer';

export const BadgeContainerTouchable: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.badgeContainerTouchable,
        {borderColor: theme.dark ? LuckySevens : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

export const EmptyListContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.emptyListContainer, style]} {...rest} />
));
EmptyListContainer.displayName = 'EmptyListContainer';

export const ChevronContainerTouchable: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.chevronContainerTouchable,
        {backgroundColor: theme.dark ? SlateDark : NeutralSlate},
        style,
      ]}
      {...rest}
    />
  );
};

export const ChevronContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.chevronContainer,
        {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
        style,
      ]}
      {...rest}
    />
  );
});
ChevronContainer.displayName = 'ChevronContainer';

const parseCssNumber = (value: string): number => parseFloat(value);

const parseCssPadding = (
  value: string,
): {padding: number} | {paddingVertical: number; paddingHorizontal: number} => {
  const parts = value.trim().split(/\s+/).map(parseCssNumber);
  if (parts.length === 1) {
    return {padding: parts[0]};
  }
  return {paddingVertical: parts[0], paddingHorizontal: parts[1]};
};

const parseCssMargin = (value: string): ViewStyle => {
  const [top, right = top, bottom = top, left = right] = value
    .trim()
    .split(/\s+/)
    .map(parseCssNumber);
  return {
    marginTop: top,
    marginRight: right,
    marginBottom: bottom,
    marginLeft: left,
  };
};

interface AccountChainsContainerProps {
  padding?: string;
  maxWidth?: string;
}

export const AccountChainsContainer: React.FC<
  AccountChainsContainerProps & React.ComponentProps<typeof TouchableOpacity>
> = ({padding, maxWidth, style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.accountChainsContainer,
        parseCssPadding(padding ?? '5px 10px'),
        {
          maxWidth: maxWidth ? parseCssNumber(maxWidth) : 250,
          backgroundColor: theme.dark ? LightBlack : NeutralSlate,
        },
        style,
      ]}
      {...rest}
    />
  );
};

interface SellTxIconProps {
  height?: number;
  width?: number;
}

export const SellTxIcon = React.forwardRef<
  View,
  SellTxIconProps & React.ComponentProps<typeof View>
>(({height, width, style, ...rest}, ref) => (
  <View
    ref={ref}
    style={[
      {height: height ?? 44, width: width ?? 44, position: 'relative'},
      style,
    ]}
    {...rest}
  />
));
SellTxIcon.displayName = 'SellTxIcon';

export const SellTxIconBadge = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.sellTxIconBadge, style]} {...rest} />
));
SellTxIconBadge.displayName = 'SellTxIconBadge';

export const CloseButtonContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.closeButtonContainer, style]} {...rest} />
);

interface ArchaxBannerContainerProps {
  inset?: any;
  isSmallScreen?: boolean;
}

export const ArchaxBannerContainer = React.forwardRef<
  View,
  ArchaxBannerContainerProps & React.ComponentProps<typeof View>
>(({inset, isSmallScreen, style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        {
          backgroundColor: theme.dark ? '#a25718' : '#ffedc9',
          overflow: 'hidden',
          marginTop: inset?.top ?? 0,
          padding: isSmallScreen ? 8 : 16,
        },
        style,
      ]}
      {...rest}
    />
  );
});
ArchaxBannerContainer.displayName = 'ArchaxBannerContainer';

interface TSSQRSectionContainerProps {
  hideBorder?: boolean;
  fullWidth?: boolean;
}

export const TSSQRSectionContainer = React.forwardRef<
  View,
  TSSQRSectionContainerProps & React.ComponentProps<typeof View>
>(({hideBorder, fullWidth, style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.tssqrSectionContainer,
        {
          borderWidth: hideBorder ? 0 : 1,
          borderColor: theme.dark ? SlateDark : Slate30,
          alignItems: fullWidth ? 'stretch' : 'center',
        },
        style,
      ]}
      {...rest}
    />
  );
});
TSSQRSectionContainer.displayName = 'TSSQRSectionContainer';

export const TSSQRContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.tssqrContainer, style]} {...rest} />
));
TSSQRContainer.displayName = 'TSSQRContainer';

export const TSSShareContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.tssShareContainer,
        {borderTopColor: theme.dark ? SlateDark : Slate30},
        style,
      ]}
      {...rest}
    />
  );
});
TSSShareContainer.displayName = 'TSSShareContainer';

export const TSSShareButtonText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.tssShareButtonText,
        {color: theme.dark ? LinkBlue : Action},
        style,
      ]}
      {...rest}
    />
  );
});
TSSShareButtonText.displayName = 'TSSShareButtonText';

export const TSSStepsSection = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.tssStepsSection, style]} {...rest} />
));
TSSStepsSection.displayName = 'TSSStepsSection';

export const TSSStepsContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.tssStepsContainer,
        {borderColor: theme.dark ? SlateDark : Slate30},
        style,
      ]}
      {...rest}
    />
  );
});
TSSStepsContainer.displayName = 'TSSStepsContainer';

export const TSSStepRow = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.tssStepRow, style]} {...rest} />
));
TSSStepRow.displayName = 'TSSStepRow';

export const TSSStepRowWithButton = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.tssStepRowWithButton, style]} {...rest} />
));
TSSStepRowWithButton.displayName = 'TSSStepRowWithButton';

export const TSSStepContentWithButton = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.tssStepContentWithButton, style]} {...rest} />
));
TSSStepContentWithButton.displayName = 'TSSStepContentWithButton';

export const TSSStepRail = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.tssStepRail, style]} {...rest} />
));
TSSStepRail.displayName = 'TSSStepRail';

interface TSSStepIndicatorProps {
  active?: boolean;
  completed?: boolean;
}

export const TSSStepIndicator = React.forwardRef<
  View,
  TSSStepIndicatorProps & React.ComponentProps<typeof View>
>(({active, completed, style, ...rest}, ref) => {
  const theme = useTheme();
  const dark = theme.dark;
  const backgroundColor = active
    ? dark
      ? '#2240C440'
      : LightBlue
    : completed
    ? dark
      ? '#004D27'
      : Success25
    : dark
    ? '#2A2A2A'
    : '#F5F5F5';
  return (
    <View
      ref={ref}
      style={[styles.tssStepIndicator, {backgroundColor}, style]}
      {...rest}
    />
  );
});
TSSStepIndicator.displayName = 'TSSStepIndicator';

interface TSSStepConnectorProps {
  completed?: boolean;
}

export const TSSStepConnector = React.forwardRef<
  View,
  TSSStepConnectorProps & React.ComponentProps<typeof View>
>(({completed, style, ...rest}, ref) => {
  const theme = useTheme();
  const dark = theme.dark;
  const backgroundColor = completed
    ? dark
      ? '#004D27'
      : Success25
    : dark
    ? '#2A2A2A'
    : '#F5F5F5';
  return (
    <View
      ref={ref}
      style={[styles.tssStepConnector, {backgroundColor}, style]}
      {...rest}
    />
  );
});
TSSStepConnector.displayName = 'TSSStepConnector';

export const TSSStepContent = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.tssStepContent, style]} {...rest} />
));
TSSStepContent.displayName = 'TSSStepContent';

export const TSSContinuePillButton = React.forwardRef<
  React.ElementRef<typeof RNTouchableOpacity>,
  React.ComponentProps<typeof RNTouchableOpacity>
>(({style, ...rest}, ref) => (
  <RNTouchableOpacity
    ref={ref}
    style={[styles.tssContinuePillButton, style]}
    {...rest}
  />
));
TSSContinuePillButton.displayName = 'TSSContinuePillButton';

export const TSSContinuePillText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.tssContinuePillText, style]} {...rest} />
));
TSSContinuePillText.displayName = 'TSSContinuePillText';

export const TSSInputWrapper = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.tssInputWrapper,
        {borderColor: theme.dark ? NeutralSlate : Black},
        style,
      ]}
      {...rest}
    />
  );
});
TSSInputWrapper.displayName = 'TSSInputWrapper';

export const TSSStyledInput = React.forwardRef<
  TextInput,
  React.ComponentProps<typeof TextInput>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <TextInput
      ref={ref}
      style={[
        styles.tssStyledInput,
        {color: theme.dark ? White : Black},
        style,
      ]}
      {...rest}
    />
  );
});
TSSStyledInput.displayName = 'TSSStyledInput';

export const TSSErrorText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.tssErrorText, style]} {...rest} />
));
TSSErrorText.displayName = 'TSSErrorText';

export const TSSStepsSectionTitle = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.tssStepsSectionTitle,
        {color: theme.dark ? White : Black},
        style,
      ]}
      {...rest}
    />
  );
});
TSSStepsSectionTitle.displayName = 'TSSStepsSectionTitle';

export const TSSStepNumber = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[styles.tssStepNumber, {color: theme.dark ? White : Black}, style]}
      {...rest}
    />
  );
});
TSSStepNumber.displayName = 'TSSStepNumber';

export const TSSStepTitle = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[styles.tssStepTitle, {color: theme.dark ? White : Black}, style]}
      {...rest}
    />
  );
});
TSSStepTitle.displayName = 'TSSStepTitle';

export const TSSStepSubtitle = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.tssStepSubtitle,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
TSSStepSubtitle.displayName = 'TSSStepSubtitle';

export const TSSStatusText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[styles.tssStatusText, {color: theme.dark ? White : Black}, style]}
      {...rest}
    />
  );
});
TSSStatusText.displayName = 'TSSStatusText';

export const TSSStatusSubText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.tssStatusSubText,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
TSSStatusSubText.displayName = 'TSSStatusSubText';
