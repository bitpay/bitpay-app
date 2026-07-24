import React from 'react';
import {StyleSheet, View, ViewProps} from 'react-native';
import {ScreenGutter} from '../../../../components/styled/Containers';
import {Disclaimer, H3, Paragraph} from '../../../../components/styled/Text';

const SCREEN_GUTTER = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  contentContainer: {
    padding: SCREEN_GUTTER,
  },
  customizeVirtualCardHeading: {
    marginBottom: 24,
  },
  customizeVirtualCardDescription: {
    marginBottom: 24,
  },
  customizeVirtualCardDisclaimer: {
    marginBottom: 24,
  },
  previewContainer: {
    alignItems: 'center',
  },
  currencyListContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  ctaContainer: {
    marginBottom: 64,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 25,
    display: 'flex',
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
});

export const ContentContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.contentContainer, style]} {...rest} />
  ),
);

export const CustomizeVirtualCardHeading = React.forwardRef<
  React.ElementRef<typeof H3>,
  React.ComponentProps<typeof H3>
>(({style, ...rest}, ref) => (
  <H3 ref={ref} style={[styles.customizeVirtualCardHeading, style]} {...rest} />
));

export const CustomizeVirtualCardDescription = React.forwardRef<
  React.ElementRef<typeof Paragraph>,
  React.ComponentProps<typeof Paragraph>
>(({style, ...rest}, ref) => (
  <Paragraph
    ref={ref}
    style={[styles.customizeVirtualCardDescription, style]}
    {...rest}
  />
));

export const CustomizeVirtualCardDisclaimer = React.forwardRef<
  React.ElementRef<typeof Disclaimer>,
  React.ComponentProps<typeof Disclaimer>
>(({style, ...rest}, ref) => (
  <Disclaimer
    ref={ref}
    style={[styles.customizeVirtualCardDisclaimer, style]}
    {...rest}
  />
));

export const PreviewContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.previewContainer, style]} {...rest} />
  ),
);

export const CurrencyListContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.currencyListContainer, style]} {...rest} />
  ),
);

export const CtaContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.ctaContainer, style]} {...rest} />
  ),
);

export const IconContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.iconContainer, style]} {...rest} />
  ),
);
