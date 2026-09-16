import React from 'react';
import {
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
  View,
  ViewProps,
} from 'react-native';
import {useTheme} from '../../contexts';
import {
  NeutralSlate,
  SlateDark,
  White,
  LightBlack,
  LuckySevens,
  Black,
  Slate30,
} from '../../styles/colors';

export const fontFamily = 'Archivo';

const styles = StyleSheet.create({
  base: {
    fontFamily,
  },
  h1: {fontSize: 50, fontStyle: 'normal', letterSpacing: 0},
  h2: {fontSize: 38, fontStyle: 'normal', letterSpacing: 0},
  h3: {fontSize: 25, fontStyle: 'normal', fontWeight: '700', letterSpacing: 0},
  h4: {
    fontSize: 20,
    fontStyle: 'normal',
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: 26,
  },
  h5: {fontSize: 18, fontStyle: 'normal', letterSpacing: 0, lineHeight: 24},
  h6: {fontSize: 16, fontStyle: 'normal', lineHeight: 21},
  h7: {fontSize: 14, fontStyle: 'normal', letterSpacing: 0, lineHeight: 18},
  listItemSubText: {marginTop: 6},
  small: {fontSize: 13, fontWeight: '400', lineHeight: 18},
  smallest: {fontSize: 12, fontWeight: '400', lineHeight: 15},
  paragraph: {
    fontSize: 16,
    fontStyle: 'normal',
    lineHeight: 25,
    letterSpacing: 0,
  },
  disclaimer: {
    fontSize: 14,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 19,
    letterSpacing: 0,
  },
  zeroHeightHeader: {height: StatusBar.currentHeight || 0},
  headerTitle: {maxWidth: Dimensions.get('window').width - 150},
  headerSubtitle: {fontSize: 16, lineHeight: 25},
  underlineLink: {textDecorationLine: 'underline', fontWeight: 'bold'},
  balance: {
    fontStyle: 'normal',
    fontWeight: '700',
    lineHeight: 53,
    letterSpacing: 0,
  },
  badge: {
    fontSize: 10,
    fontStyle: 'normal',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 12,
    ...(Platform.OS === 'ios' ? {marginTop: -1} : null),
  },
  proposalBadge: {
    color: 'white',
    fontSize: 14,
    fontStyle: 'normal',
    fontWeight: '400',
  },
  importTitle: {
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.75,
    textTransform: 'uppercase',
  },
  infoTitle: {fontSize: 16},
  infoHeader: {flexDirection: 'row', marginBottom: 10},
  infoDescription: {fontSize: 16, lineHeight: 24},
  optionTitle: {fontWeight: '700', marginBottom: 5},
  optionDescription: {fontSize: 14, lineHeight: 18},
  type: {
    fontSize: 12,
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  copyToClipboardText: {
    fontSize: 16,
    paddingTop: 0,
    paddingRight: 20,
    paddingBottom: 0,
    paddingLeft: 10,
  },
});

interface HeadingProps {
  bold?: boolean;
  medium?: boolean;
}

export const BaseText = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[styles.base, {color: theme.colors.text}, style]}
        {...rest}
      />
    );
  },
);
BaseText.displayName = 'BaseText';

export const H1 = React.forwardRef<Text, HeadingProps & TextProps>(
  ({medium = false, style, ...rest}, ref) => {
    const theme = useTheme();
    const fontWeight: TextStyle['fontWeight'] = medium ? '500' : '700';
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          styles.h1,
          {color: theme.colors.text, fontWeight},
          style,
        ]}
        {...rest}
      />
    );
  },
);
H1.displayName = 'H1';

export const H2 = React.forwardRef<Text, HeadingProps & TextProps>(
  ({medium = false, style, ...rest}, ref) => {
    const theme = useTheme();
    const fontWeight: TextStyle['fontWeight'] = medium ? '500' : '700';
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          styles.h2,
          {color: theme.colors.text, fontWeight},
          style,
        ]}
        {...rest}
      />
    );
  },
);
H2.displayName = 'H2';

export const H3 = React.forwardRef<Text, HeadingProps & TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[styles.base, styles.h3, {color: theme.colors.text}, style]}
        {...rest}
      />
    );
  },
);
H3.displayName = 'H3';

export const H4 = React.forwardRef<Text, HeadingProps & TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[styles.base, styles.h4, {color: theme.colors.text}, style]}
        {...rest}
      />
    );
  },
);
H4.displayName = 'H4';

export const H5 = React.forwardRef<Text, HeadingProps & TextProps>(
  ({bold = false, style, ...rest}, ref) => {
    const theme = useTheme();
    const fontWeight: TextStyle['fontWeight'] = bold ? '700' : '500';
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          styles.h5,
          {color: theme.colors.text, fontWeight},
          style,
        ]}
        {...rest}
      />
    );
  },
);
H5.displayName = 'H5';

export const H6 = React.forwardRef<Text, HeadingProps & TextProps>(
  ({medium, style, ...rest}, ref) => {
    const theme = useTheme();
    const fontWeight: TextStyle['fontWeight'] = medium ? '400' : '500';
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          styles.h6,
          {color: theme.colors.text, fontWeight},
          style,
        ]}
        {...rest}
      />
    );
  },
);
H6.displayName = 'H6';

export const H7 = React.forwardRef<Text, HeadingProps & TextProps>(
  ({medium = false, style, ...rest}, ref) => {
    const theme = useTheme();
    const fontWeight: TextStyle['fontWeight'] = medium ? '500' : '400';
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          styles.h7,
          {color: theme.colors.text, fontWeight},
          style,
        ]}
        {...rest}
      />
    );
  },
);
H7.displayName = 'H7';

export const SubText = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          styles.h7,
          {color: theme.colors.description, fontWeight: '400'},
          style,
        ]}
        {...rest}
      />
    );
  },
);
SubText.displayName = 'SubText';

interface ListItemSubTextProps {
  textAlign?: 'right' | 'left' | 'center';
}

export const ListItemSubText = React.forwardRef<
  Text,
  ListItemSubTextProps & TextProps
>(({textAlign = 'left', style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <Text
      ref={ref}
      style={[
        styles.base,
        styles.h7,
        styles.listItemSubText,
        {
          color: theme.dark ? LuckySevens : SlateDark,
          fontWeight: '400',
          textAlign,
        },
        style,
      ]}
      {...rest}
    />
  );
});
ListItemSubText.displayName = 'ListItemSubText';

export const Small = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[styles.base, styles.small, {color: theme.colors.text}, style]}
        {...rest}
      />
    );
  },
);
Small.displayName = 'Small';

export const Smallest = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          styles.smallest,
          {color: theme.dark ? LuckySevens : Black},
          style,
        ]}
        {...rest}
      />
    );
  },
);
Smallest.displayName = 'Smallest';

export const Paragraph = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          styles.paragraph,
          {color: theme.dark ? Slate30 : SlateDark},
          style,
        ]}
        {...rest}
      />
    );
  },
);
Paragraph.displayName = 'Paragraph';

export const Disclaimer = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          styles.disclaimer,
          {color: theme.colors.text},
          style,
        ]}
        {...rest}
      />
    );
  },
);
Disclaimer.displayName = 'Disclaimer';

interface ExponentProps {
  i: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
}

const EXPONENT_UNICODE_MAP: {
  [k in 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9]: string;
} = {
  0: '⁰',
  1: '¹',
  2: '²',
  3: '³',
  4: '⁴',
  5: '⁵',
  6: '⁶',
  7: '⁷',
  8: '⁸',
  9: '⁹',
};

/**
 * Renders a number 0-9 as a unicode exponent in a Text element.
 * @param i The number 0-9 to use as the exponent.
 */
export const Exp = (props: ExponentProps) => {
  return <Text>{EXPONENT_UNICODE_MAP[props.i]}</Text>;
};

// Nav
/**
 * Intended to be used with translucent StatusBar (Android) when no header is desired but still want to clear the StatusBar height.
 */
export const ZeroHeightHeader = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <View
        ref={ref}
        style={[
          styles.zeroHeightHeader,
          {backgroundColor: theme.colors.background},
          style,
        ]}
        {...rest}
      />
    );
  },
);
ZeroHeightHeader.displayName = 'ZeroHeightHeader';

export const HeaderTitle = React.forwardRef<Text, HeadingProps & TextProps>(
  ({bold = true, numberOfLines = 1, style, ...rest}, ref) => {
    const theme = useTheme();
    const fontWeight: TextStyle['fontWeight'] = bold ? '700' : '500';
    return (
      <Text
        ref={ref}
        numberOfLines={numberOfLines}
        style={[
          styles.base,
          styles.h5,
          styles.headerTitle,
          {color: theme.colors.text, fontWeight},
          style,
        ]}
        {...rest}
      />
    );
  },
);
HeaderTitle.displayName = 'HeaderTitle';

export const HeaderSubtitle = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          styles.headerSubtitle,
          {color: theme.colors.text},
          style,
        ]}
        {...rest}
      />
    );
  },
);
HeaderSubtitle.displayName = 'HeaderSubtitle';

interface TextAlignProps {
  align: 'center' | 'left' | 'right' | 'justify';
}

export const TextAlign = React.forwardRef<Text, TextAlignProps & TextProps>(
  ({align, style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          {color: theme.colors.text, textAlign: align},
          style,
        ]}
        {...rest}
      />
    );
  },
);
TextAlign.displayName = 'TextAlign';

export const Link = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[styles.base, {color: theme.colors.link}, style]}
        {...rest}
      />
    );
  },
);
Link.displayName = 'Link';

export const UnderlineLink = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          styles.underlineLink,
          {
            color: theme.colors.text,
            textDecorationColor: theme.colors.text,
          },
          style,
        ]}
        {...rest}
      />
    );
  },
);
UnderlineLink.displayName = 'UnderlineLink';

// WALLET
interface BalanceProps {
  scale: boolean;
}

export const Balance = React.forwardRef<Text, BalanceProps & TextProps>(
  ({scale, style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          styles.balance,
          {color: theme.colors.text, fontSize: scale ? 26 : 36},
          style,
        ]}
        {...rest}
      />
    );
  },
);
Balance.displayName = 'Balance';

export const Badge = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          styles.badge,
          {color: theme.dark ? Slate30 : SlateDark},
          style,
        ]}
        {...rest}
      />
    );
  },
);
Badge.displayName = 'Badge';

export const ProposalBadge = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => (
    <Text
      ref={ref}
      style={[styles.base, styles.proposalBadge, style]}
      {...rest}
    />
  ),
);
ProposalBadge.displayName = 'ProposalBadge';

export const ImportTitle = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          styles.importTitle,
          {color: theme.colors.text},
          style,
        ]}
        {...rest}
      />
    );
  },
);
ImportTitle.displayName = 'ImportTitle';

export const InfoTitle = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          styles.infoTitle,
          {color: theme.colors.text},
          style,
        ]}
        {...rest}
      />
    );
  },
);
InfoTitle.displayName = 'InfoTitle';

export const InfoHeader = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.infoHeader, style]} {...rest} />
  ),
);
InfoHeader.displayName = 'InfoHeader';

export const InfoDescription = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          styles.infoDescription,
          {color: theme.dark ? White : SlateDark},
          style,
        ]}
        {...rest}
      />
    );
  },
);
InfoDescription.displayName = 'InfoDescription';

// creation and add wallet
export const OptionTitle = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          styles.h6,
          styles.optionTitle,
          {color: theme.colors.text},
          style,
        ]}
        {...rest}
      />
    );
  },
);
OptionTitle.displayName = 'OptionTitle';

export const OptionDescription = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          styles.optionDescription,
          {color: theme.dark ? White : SlateDark},
          style,
        ]}
        {...rest}
      />
    );
  },
);
OptionDescription.displayName = 'OptionDescription';

interface TypeProps {
  noAutoMarginLeft?: boolean;
}

export const Type = React.forwardRef<Text, TypeProps & TextProps>(
  ({noAutoMarginLeft, style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          styles.type,
          {
            color: theme.dark ? LuckySevens : SlateDark,
            borderColor: theme.dark ? LightBlack : Slate30,
            marginLeft: noAutoMarginLeft ? 0 : 'auto',
          },
          style,
        ]}
        {...rest}
      />
    );
  },
);
Type.displayName = 'Type';

export const CopyToClipboardText = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          styles.base,
          styles.copyToClipboardText,
          {color: theme.dark ? NeutralSlate : '#6F7782'},
          style,
        ]}
        {...rest}
      />
    );
  },
);
CopyToClipboardText.displayName = 'CopyToClipboardText';

interface ArchaxBannerTextProps {
  isSmallScreen?: boolean;
}

export const ArchaxBannerText = React.forwardRef<
  Text,
  ArchaxBannerTextProps & TextProps
>(({isSmallScreen, style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <Text
      ref={ref}
      style={[
        styles.base,
        {
          color: theme.colors.text,
          fontSize: isSmallScreen ? 8 : 14,
        },
        style,
      ]}
      {...rest}
    />
  );
});
ArchaxBannerText.displayName = 'ArchaxBannerText';

export const ArchaxBannerLink = React.forwardRef<
  Text,
  ArchaxBannerTextProps & TextProps
>(({isSmallScreen, style, ...rest}, ref) => {
  const theme = useTheme();
  const linkColor = theme.dark ? '#ffffff' : theme.colors.link;
  return (
    <Text
      ref={ref}
      style={[
        styles.base,
        {
          color: linkColor,
          textDecorationLine: 'underline',
          textDecorationColor: linkColor,
          fontSize: isSmallScreen ? 8 : 14,
        },
        style,
      ]}
      {...rest}
    />
  );
});
ArchaxBannerLink.displayName = 'ArchaxBannerLink';
