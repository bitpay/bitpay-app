import React from 'react';
import {StyleSheet, Text, View, ViewProps, TextProps} from 'react-native';
import {useTheme} from '../../../../contexts';
import {
  TouchableOpacity,
  TouchableOpacityProps,
} from '@components/base/TouchableOpacity';
import {WIDTH} from '../../../../components/styled/Containers';
import {BaseText, H7} from '../../../../components/styled/Text';
import {
  SlateDark,
  White,
  LightBlack,
  NeutralSlate,
  Slate10,
  Black,
  Action,
  LinkBlue,
  Slate30,
} from '../../../../styles/colors';

const SMALL_SCREEN_WIDTH_THRESHOLD = 420;

// Helper function to calculate font size based on text length
const getAmountFontSize = (textLength?: number): number => {
  if (WIDTH >= SMALL_SCREEN_WIDTH_THRESHOLD) {
    return 32;
  }
  // Dynamic font size for small screens
  if (!textLength || textLength <= 8) {
    return 32;
  }
  if (textLength <= 10) {
    return 26;
  }
  if (textLength <= 14) {
    return 22;
  }
  if (textLength <= 18) {
    return 18;
  }
  return 16;
};

const parsePx = (value: string): number => parseFloat(value);

const parsePaddingShorthand = (
  value: string,
): {
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
} => {
  const parts = value.trim().split(/\s+/).map(parsePx);
  const [top, right = top, bottom = top, left = right] = parts;
  return {
    paddingTop: top,
    paddingRight: right,
    paddingBottom: bottom,
    paddingLeft: left,
  };
};

const styles = StyleSheet.create({
  ctaContainer: {
    marginVertical: 20,
    marginHorizontal: 15,
  },
  swapCryptoCard: {
    borderWidth: 1,
    borderRadius: 12,
    margin: 15,
    padding: 16,
  },
  offerContainer: {
    marginBottom: 15,
    width: '100%',
  },
  itemDivisor: {
    borderBottomWidth: 1,
  },
  amountCryptoCard: {
    borderWidth: 1,
    borderRadius: 9,
    marginVertical: 0,
    marginHorizontal: 15,
    padding: 14,
  },
  summaryTitle: {
    fontSize: 14,
    marginBottom: 15,
  },
  walletBalanceContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    marginRight: 10,
  },
  arrowContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  arrowBoxContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    height: 0,
  },
  arrowBox: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -26,
    borderRadius: 10,
    width: 40,
    height: 40,
    borderWidth: 2.5,
    zIndex: 999,
  },
  selectorArrowContainer: {
    marginLeft: 10,
  },
  actionsContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  swapCardHeaderTitle: {
    lineHeight: 18,
  },
  swapCardAccountChainsContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 1,
    height: 23,
    borderRadius: 27.5,
  },
  swapCardAccountText: {
    fontSize: 13,
    lineHeight: 15,
    fontWeight: '500',
    letterSpacing: 0,
    marginLeft: 6,
    flexShrink: 1,
    fontStyle: 'normal',
  },
  swapCardHeaderContainer: {
    flex: 1,
    flexDirection: 'row',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignContent: 'center',
  },
  swapCardAmountAndWalletContainer: {
    width: '100%',
    marginVertical: 20,
    marginHorizontal: 0,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  swapCardBottomRowContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  limitAmountBtn: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginLeft: 5,
    marginRight: 5,
  },
  limitAmountBtnText: {
    fontSize: 13,
  },
  amountClickableContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 80,
  },
  selectedOptionContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'flex-end',
    height: 36,
    padding: 8,
    minWidth: 146,
    borderRadius: 27.5,
  },
  swapCryptoWalletSelectorContainer: {
    marginVertical: 8,
    marginHorizontal: 16,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletSelector: {
    height: 40,
    borderRadius: 27.5,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    minWidth: 146,
  },
  walletSelectorLeft: {
    display: 'flex',
    justifyContent: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletSelectorRight: {
    display: 'flex',
    justifyContent: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletSelectorName: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0,
    marginLeft: 8,
    marginRight: 5,
  },
  selectedOptionText: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0,
    maxWidth: 120,
  },
  selectedOptionCol: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  swapCurrenciesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
  },
  coinIconContainer: {
    width: 30,
    height: 25,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dataText: {
    fontSize: 13,
    textAlign: 'center',
  },
  amountText: {
    fontWeight: '700',
    letterSpacing: 0,
    textAlign: 'center',
    flexShrink: 1,
  },
  bottomDataText: {
    fontSize: 13,
  },
  providerContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  providerLabel: {
    marginRight: 10,
  },
  spinnerContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    marginLeft: 10,
  },
  balanceContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
});

export const CtaContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.ctaContainer, style]} {...rest} />
);

export const SwapCryptoCard: React.FC<ViewProps> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.swapCryptoCard,
        {
          borderColor: theme.dark ? LightBlack : '#eaeaea',
          backgroundColor: theme.dark ? LightBlack : Slate10,
        },
        style,
      ]}
      {...rest}
    />
  );
};

export const OfferContainer: React.FC<ViewProps & {isModal?: boolean}> = ({
  style,
  ...rest
}) => <View style={[styles.offerContainer, style]} {...rest} />;

export const ItemDivisor: React.FC<ViewProps> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.itemDivisor,
        {borderBottomColor: theme.dark ? SlateDark : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

export const AmountCryptoCard: React.FC<ViewProps> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.amountCryptoCard,
        {borderColor: theme.dark ? LightBlack : '#eaeaea'},
        style,
      ]}
      {...rest}
    />
  );
};

export const SummaryTitle = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.summaryTitle,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
SummaryTitle.displayName = 'SummaryTitle';

export const WalletBalanceContainer: React.FC<ViewProps> = ({
  style,
  ...rest
}) => <View style={[styles.walletBalanceContainer, style]} {...rest} />;

export const ArrowContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.arrowContainer, style]} {...rest} />
);

export const ArrowBoxContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.arrowBoxContainer, style]} {...rest} />
);

export const ArrowBox: React.FC<ViewProps> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.arrowBox,
        {
          backgroundColor: theme.dark ? LightBlack : NeutralSlate,
          borderColor: theme.dark ? Black : White,
        },
        style,
      ]}
      {...rest}
    />
  );
};

export const SelectorArrowContainer: React.FC<ViewProps> = ({
  style,
  ...rest
}) => <View style={[styles.selectorArrowContainer, style]} {...rest} />;

export const ActionsContainer: React.FC<ViewProps & {alignEnd?: boolean}> = ({
  style,
  alignEnd,
  ...rest
}) => (
  <View
    style={[
      styles.actionsContainer,
      {justifyContent: alignEnd ? 'flex-end' : 'space-between'},
      style,
    ]}
    {...rest}
  />
);

export const SwapCardHeaderTitle = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          styles.swapCardHeaderTitle,
          {color: theme.dark ? White : '#434d5a'},
          style,
        ]}
        {...rest}
      />
    );
  },
);
SwapCardHeaderTitle.displayName = 'SwapCardHeaderTitle';

export const SwapCardAccountChainsContainer: React.FC<
  ViewProps & {padding?: string; maxWidth?: string}
> = ({style, padding, maxWidth, ...rest}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.swapCardAccountChainsContainer,
        {
          maxWidth: parsePx(maxWidth ? maxWidth : '250px'),
          ...parsePaddingShorthand(padding ?? '4px 8px'),
          backgroundColor: theme.dark ? Black : White,
        },
        style,
      ]}
      {...rest}
    />
  );
};

export const SwapCardAccountText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.swapCardAccountText,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
SwapCardAccountText.displayName = 'SwapCardAccountText';

export const SwapCardHeaderContainer: React.FC<
  ViewProps & {noMargin?: boolean}
> = ({style, ...rest}) => (
  <View style={[styles.swapCardHeaderContainer, style]} {...rest} />
);

export const SwapCardAmountAndWalletContainer: React.FC<
  ViewProps & {alignEnd?: boolean}
> = ({style, alignEnd, ...rest}) => (
  <View
    style={[
      styles.swapCardAmountAndWalletContainer,
      {justifyContent: alignEnd ? 'flex-end' : 'space-between'},
      style,
    ]}
    {...rest}
  />
);

export const SwapCardBottomRowContainer: React.FC<
  ViewProps & {alignEnd?: boolean}
> = ({style, alignEnd, ...rest}) => (
  <View
    style={[
      styles.swapCardBottomRowContainer,
      {justifyContent: alignEnd ? 'flex-end' : 'space-between'},
      style,
    ]}
    {...rest}
  />
);

export const LimitAmountBtn: React.FC<
  TouchableOpacityProps & {noBackground?: boolean}
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.limitAmountBtn, style]} {...rest} />
);

export const LimitAmountBtnText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.limitAmountBtnText,
        {color: theme.dark ? LinkBlue : Action},
        style,
      ]}
      {...rest}
    />
  );
});
LimitAmountBtnText.displayName = 'LimitAmountBtnText';

export const AmountClickableContainer: React.FC<TouchableOpacityProps> = ({
  style,
  ...rest
}) => (
  <TouchableOpacity
    style={[styles.amountClickableContainer, style]}
    {...rest}
  />
);

export const SelectedOptionContainer: React.FC<
  TouchableOpacityProps & {noBackground?: boolean}
> = ({style, noBackground, disabled, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      disabled={disabled}
      style={[
        styles.selectedOptionContainer,
        {
          backgroundColor: noBackground
            ? 'transparent'
            : theme.dark
            ? LightBlack
            : NeutralSlate,
          opacity: disabled ? 0.2 : 1,
        },
        style,
      ]}
      {...rest}
    />
  );
};

export const SwapCryptoWalletSelectorContainer: React.FC<ViewProps> = ({
  style,
  ...rest
}) => (
  <View style={[styles.swapCryptoWalletSelectorContainer, style]} {...rest} />
);

export const WalletSelector: React.FC<
  TouchableOpacityProps & {disabled?: boolean; isBigScreen?: boolean}
> = ({style, disabled, isBigScreen, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      disabled={disabled}
      style={[
        styles.walletSelector,
        {
          backgroundColor: theme.dark ? Black : White,
          maxWidth: isBigScreen ? 220 : 185,
          opacity: disabled ? 0.2 : 1,
        },
        style,
      ]}
      {...rest}
    />
  );
};

export const WalletSelectorLeft: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.walletSelectorLeft, style]} {...rest} />
);

export const WalletSelectorRight: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.walletSelectorRight, style]} {...rest} />
);

export const WalletSelectorName = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          styles.walletSelectorName,
          {color: theme.dark ? White : SlateDark},
          style,
        ]}
        {...rest}
      />
    );
  },
);
WalletSelectorName.displayName = 'WalletSelectorName';

export const SelectedOptionText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.selectedOptionText,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
SelectedOptionText.displayName = 'SelectedOptionText';

export const SelectedOptionCol: React.FC<
  ViewProps & {justifyContent?: string}
> = ({style, justifyContent, ...rest}) => (
  <View
    style={[
      styles.selectedOptionCol,
      {justifyContent: (justifyContent ?? 'center') as any},
      style,
    ]}
    {...rest}
  />
);

export const SwapCurrenciesButton: React.FC<TouchableOpacityProps> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.swapCurrenciesButton,
        {backgroundColor: theme.dark ? Black : White},
        style,
      ]}
      {...rest}
    />
  );
};

export const CoinIconContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.coinIconContainer, style]} {...rest} />
);

export const DataText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[styles.dataText, {color: theme.dark ? White : SlateDark}, style]}
      {...rest}
    />
  );
});
DataText.displayName = 'DataText';

export const AmountText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText> & {textLength?: number}
>(({style, textLength, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.amountText,
        {
          fontSize: getAmountFontSize(textLength),
          color: theme.dark ? White : SlateDark,
        },
        style,
      ]}
      {...rest}
    />
  );
});
AmountText.displayName = 'AmountText';

export const BottomDataText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.bottomDataText,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
BottomDataText.displayName = 'BottomDataText';

export const ProviderContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.providerContainer, style]} {...rest} />
);

export const ProviderLabel = React.forwardRef<
  Text,
  React.ComponentProps<typeof H7>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <H7
      ref={ref}
      style={[
        styles.providerLabel,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
ProviderLabel.displayName = 'ProviderLabel';

export const SpinnerContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.spinnerContainer, style]} {...rest} />
);

export const WalletTextContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.walletTextContainer, style]} {...rest} />
);

export const BalanceContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.balanceContainer, style]} {...rest} />
);
