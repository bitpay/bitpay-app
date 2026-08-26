import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../../../../contexts';
import {LightBlack, SlateDark, White, Slate30} from '../../../../styles/colors';
import {BaseText} from '../../../../components/styled/Text';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const styles = StyleSheet.create({
  sellCryptoExpandibleCard: {
    borderWidth: 1,
    borderRadius: 9,
    marginTop: 20,
    marginRight: 15,
    marginBottom: 0,
    marginLeft: 15,
    paddingVertical: 18,
    paddingHorizontal: 14,
  },
  sellCryptoOfferLine: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellCryptoOfferText: {
    lineHeight: 18,
  },
  sellCryptoOfferDataText: {
    fontSize: 16,
    maxWidth: 160,
    marginRight: 24,
  },
  sellTermsContainer: {
    marginTop: 20,
  },
  sellBalanceContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  sellBottomDataText: {
    fontSize: 14,
  },
  itemDivisor: {
    borderBottomWidth: 1,
  },
});

export const SellCryptoExpandibleCard: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.sellCryptoExpandibleCard,
        {borderColor: theme.dark ? LightBlack : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

export const SellCryptoOfferLine = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.sellCryptoOfferLine, style]} {...rest} />
));
SellCryptoOfferLine.displayName = 'SellCryptoOfferLine';

export const SellCryptoOfferText = React.forwardRef<
  Text,
  React.ComponentProps<typeof Text>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <Text
      ref={ref}
      style={[
        styles.sellCryptoOfferText,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
SellCryptoOfferText.displayName = 'SellCryptoOfferText';

export const SellCryptoOfferDataText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.sellCryptoOfferDataText,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
SellCryptoOfferDataText.displayName = 'SellCryptoOfferDataText';

export const SellTermsContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.sellTermsContainer, style]} {...rest} />
));
SellTermsContainer.displayName = 'SellTermsContainer';

export const SellBalanceContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.sellBalanceContainer, style]} {...rest} />
));
SellBalanceContainer.displayName = 'SellBalanceContainer';

export const SellBottomDataText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.sellBottomDataText,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
SellBottomDataText.displayName = 'SellBottomDataText';

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
