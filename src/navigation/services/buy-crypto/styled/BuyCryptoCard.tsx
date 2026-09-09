import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../../../../contexts';
import {
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
  Slate30,
  Slate,
} from '../../../../styles/colors';
import {BaseText} from '../../../../components/styled/Text';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const styles = StyleSheet.create({
  buyCryptoItemCard: {
    borderWidth: 1,
    borderRadius: 9,
    marginVertical: 8,
    marginHorizontal: 16,
    padding: 14,
  },
  buyCryptoExpandibleCard: {
    borderWidth: 1,
    borderRadius: 9,
    marginTop: 20,
    marginRight: 15,
    marginBottom: 0,
    marginLeft: 15,
    paddingVertical: 18,
    paddingHorizontal: 14,
  },
  actionsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedOptionContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 14,
    paddingVertical: 0,
    borderRadius: 12,
  },
  selectedOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedOptionCol: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dataText: {
    fontSize: 18,
    maxWidth: 160,
  },
  coinIconContainer: {
    width: 30,
    height: 25,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDivisor: {
    borderBottomWidth: 1,
  },
  buyCryptoItemTitle: {
    marginTop: 0,
    marginRight: 0,
    marginBottom: 18,
    marginLeft: 0,
    lineHeight: 18,
  },
});

export const BuyCryptoItemCard: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.buyCryptoItemCard,
        {borderColor: theme.dark ? LightBlack : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

export const BuyCryptoExpandibleCard: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.buyCryptoExpandibleCard,
        {borderColor: theme.dark ? LightBlack : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

export const ActionsContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.actionsContainer, style]} {...rest} />
));
ActionsContainer.displayName = 'ActionsContainer';

export const SelectedOptionContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.selectedOptionContainer,
        {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
        style,
      ]}
      {...rest}
    />
  );
});
SelectedOptionContainer.displayName = 'SelectedOptionContainer';

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

export const SelectedOptionCol = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.selectedOptionCol, style]} {...rest} />
));
SelectedOptionCol.displayName = 'SelectedOptionCol';

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

export const CoinIconContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.coinIconContainer, style]} {...rest} />
));
CoinIconContainer.displayName = 'CoinIconContainer';

export const ItemDivisor = React.forwardRef<
  View,
  React.ComponentProps<typeof View> & {selected?: boolean}
>(({style, selected: _selected, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.itemDivisor,
        {borderBottomColor: theme.dark ? LightBlack : Slate},
        style,
      ]}
      {...rest}
    />
  );
});
ItemDivisor.displayName = 'ItemDivisor';

export const BuyCryptoItemTitle = React.forwardRef<
  Text,
  React.ComponentProps<typeof Text>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <Text
      ref={ref}
      style={[
        styles.buyCryptoItemTitle,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
BuyCryptoItemTitle.displayName = 'BuyCryptoItemTitle';
