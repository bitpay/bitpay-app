import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../../../../contexts';
import {BaseText, Small} from '../../../../components/styled/Text';
import {LuckySevens, SlateDark} from '../../../../styles/colors';

const styles = StyleSheet.create({
  termsContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
  },
  termsContainerOffer: {
    marginTop: 20,
  },
  exchangeTermsContainer: {
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 10,
    paddingLeft: 0,
  },
  termsText: {
    lineHeight: 20,
  },
  exchangeTermsText: {
    fontSize: 11,
    lineHeight: 20,
    color: LuckySevens,
  },
});

export const TermsContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.termsContainer, style]} {...rest} />
));
TermsContainer.displayName = 'TermsContainer';

export const TermsContainerOffer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.termsContainerOffer, style]} {...rest} />
));
TermsContainerOffer.displayName = 'TermsContainerOffer';

export const ExchangeTermsContainer = React.forwardRef<
  View,
  React.ComponentProps<typeof View>
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.exchangeTermsContainer, style]} {...rest} />
));
ExchangeTermsContainer.displayName = 'ExchangeTermsContainer';

export const TermsText = React.forwardRef<
  Text,
  React.ComponentProps<typeof Small>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <Small
      ref={ref}
      style={[
        styles.termsText,
        {color: theme.dark ? LuckySevens : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
TermsText.displayName = 'TermsText';

export const ExchangeTermsText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.exchangeTermsText, style]} {...rest} />
));
ExchangeTermsText.displayName = 'ExchangeTermsText';
