import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../../../../contexts';
import {BaseText, H7} from '../../../../components/styled/Text';
import {
  SlateDark,
  Slate30,
  White,
  LightBlack,
  NeutralSlate,
  LinkBlue,
  Slate,
  Slate10,
} from '../../../../styles/colors';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const styles = StyleSheet.create({
  itemDivisor: {
    borderBottomWidth: 1,
  },
  rowDataContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 16,
    marginHorizontal: 0,
  },
  fiatAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cryptoUnit: {
    fontSize: 15,
    paddingTop: 7,
    paddingLeft: 5,
  },
  rowLabel: {
    fontSize: 14,
  },
  rowData: {
    fontSize: 16,
  },
  fiatAmount: {
    fontSize: 14,
    color: '#667',
  },
  selectedOptionContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40,
    paddingVertical: 0,
    paddingHorizontal: 14,
    borderRadius: 19.5,
  },
  selectedOptionCol: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinIconContainer: {
    width: 30,
    height: 25,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkBoxContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
  },
  swapCheckBoxContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    margin: 15,
    padding: 16,
  },
  checkBoxCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  swapCheckboxText: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    margin: 0,
    paddingTop: 0,
    paddingRight: 30,
    paddingBottom: 0,
    paddingLeft: 10,
  },
  checkboxText: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
    marginVertical: 0,
    marginHorizontal: 20,
  },
  policiesContainer: {
    marginTop: 16,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 20,
  },
  policiesText: {
    color: LinkBlue,
    fontSize: 13,
  },
  arrowContainer: {
    marginLeft: 10,
  },
});

export const ItemDivisor = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.itemDivisor,
        {borderBottomColor: theme.dark ? LightBlack : Slate30},
        style,
      ]}
      {...rest}
    />
  );
});
ItemDivisor.displayName = 'ItemDivisor';

export const RowDataContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.rowDataContainer, style]} {...rest} />
));
RowDataContainer.displayName = 'RowDataContainer';

export const FiatAmountContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.fiatAmountContainer, style]} {...rest} />
));
FiatAmountContainer.displayName = 'FiatAmountContainer';

export const CryptoUnit = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.cryptoUnit, style]} {...rest} />
));
CryptoUnit.displayName = 'CryptoUnit';

export const RowLabel = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.rowLabel, style]} {...rest} />
));
RowLabel.displayName = 'RowLabel';

export const RowData = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.rowData, style]} {...rest} />
));
RowData.displayName = 'RowData';

export const FiatAmount = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.fiatAmount, style]} {...rest} />
));
FiatAmount.displayName = 'FiatAmount';

export const SelectedOptionContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, disabled, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      disabled={disabled}
      style={[
        styles.selectedOptionContainer,
        {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
        {opacity: disabled ? 0.2 : 1},
        style,
      ]}
      {...rest}
    />
  );
};

export const SelectedOptionText = React.forwardRef<
  Text,
  React.ComponentProps<typeof H7>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <H7
      ref={ref}
      style={[{color: theme.dark ? White : SlateDark}, style]}
      {...rest}
    />
  );
});
SelectedOptionText.displayName = 'SelectedOptionText';

export const SelectedOptionCol = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.selectedOptionCol, style]} {...rest} />
));
SelectedOptionCol.displayName = 'SelectedOptionCol';

export const CoinIconContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.coinIconContainer, style]} {...rest} />
));
CoinIconContainer.displayName = 'CoinIconContainer';

export const CheckBoxContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.checkBoxContainer,
        {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
        style,
      ]}
      {...rest}
    />
  );
});
CheckBoxContainer.displayName = 'CheckBoxContainer';

export const SwapCheckBoxContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.swapCheckBoxContainer,
        {
          borderColor: theme.dark ? LightBlack : '#eaeaea',
          backgroundColor: theme.dark ? LightBlack : Slate10,
        },
        style,
      ]}
      {...rest}
    />
  );
});
SwapCheckBoxContainer.displayName = 'SwapCheckBoxContainer';

export const CheckBoxCol = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.checkBoxCol, style]} {...rest} />
));
CheckBoxCol.displayName = 'CheckBoxCol';

export const CheckBoxTextContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => <View ref={ref} style={style} {...rest} />);
CheckBoxTextContainer.displayName = 'CheckBoxTextContainer';

export const SwapCheckboxText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.swapCheckboxText,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
SwapCheckboxText.displayName = 'SwapCheckboxText';

export const CheckboxText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.checkboxText,
        {color: theme.dark ? Slate : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
CheckboxText.displayName = 'CheckboxText';

export const PoliciesContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.policiesContainer, style]} {...rest} />
);

export const PoliciesText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.policiesText, style]} {...rest} />
));
PoliciesText.displayName = 'PoliciesText';

export const ArrowContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.arrowContainer, style]} {...rest} />
));
ArrowContainer.displayName = 'ArrowContainer';
