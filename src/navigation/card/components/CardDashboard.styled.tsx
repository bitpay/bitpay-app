import React from 'react';
import {View, ViewProps, Text, TextProps, StyleSheet} from 'react-native';
import {useTheme} from '../../../contexts';
import {ScreenGutter} from '../../../components/styled/Containers';
import {BaseText, H5} from '../../../components/styled/Text';
import {
  Air,
  LightBlack,
  NeutralSlate,
  Slate,
  SlateDark,
} from '../../../styles/colors';
import {
  TouchableOpacity,
  TouchableOpacityProps,
} from '@components/base/TouchableOpacity';

const gutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  transactionListHeader: {
    flexDirection: 'row',
    minHeight: 50,
    alignItems: 'center',
    padding: gutter,
    borderBottomWidth: 1,
  },
  transactionListHeaderTitle: {
    flex: 1,
  },
  transactionListHeaderIcon: {
    flexGrow: 0,
    marginLeft: gutter,
  },
  transactionListFooter: {
    marginTop: 44,
    padding: gutter,
  },
  emptyListContainer: {
    alignItems: 'center',
    padding: gutter,
    marginTop: 28,
    marginHorizontal: gutter,
    marginBottom: 108,
  },
  emptyGhostContainer: {
    marginBottom: 32,
  },
  emptyListDescription: {
    fontSize: 16,
    lineHeight: 25,
    textAlign: 'center',
  },
});

export const TransactionListHeader = ({style, ...rest}: ViewProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.transactionListHeader,
        {
          backgroundColor: theme.dark ? LightBlack : NeutralSlate,
          borderColor: theme.dark ? LightBlack : Air,
        },
        style,
      ]}
      {...rest}
    />
  );
};

export const TransactionListHeaderTitle = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => (
    <H5
      ref={ref}
      style={[styles.transactionListHeaderTitle, style]}
      {...rest}
    />
  ),
);

export const TransactionListHeaderIcon: React.FC<TouchableOpacityProps> = ({
  style,
  ...rest
}) => (
  <TouchableOpacity
    style={[styles.transactionListHeaderIcon, style]}
    {...rest}
  />
);

export const TransactionListFooter = ({style, ...rest}: ViewProps) => (
  <View style={[styles.transactionListFooter, style]} {...rest} />
);

export const EmptyListContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.emptyListContainer, style]} {...rest} />
);

export const EmptyGhostContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.emptyGhostContainer, style]} {...rest} />
);

export const EmptyListDescription = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <BaseText
        ref={ref}
        style={[
          styles.emptyListDescription,
          {color: theme.dark ? Slate : SlateDark},
          style,
        ]}
        {...rest}
      />
    );
  },
);
