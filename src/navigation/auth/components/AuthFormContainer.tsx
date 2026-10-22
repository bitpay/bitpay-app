import React from 'react';
import {
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewProps,
} from 'react-native';
import {useTheme} from '../../../contexts';
import {ScreenGutter} from '../../../components/styled/Containers';
import {BaseText} from '../../../components/styled/Text';
import {Caution} from '../../../styles/colors';

const SCREEN_GUTTER = Number.parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  authFormContainer: {
    paddingVertical: 24,
    paddingHorizontal: SCREEN_GUTTER,
  },
  authRowContainer: {
    marginBottom: 12,
  },
  checkboxControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 16,
    marginLeft: SCREEN_GUTTER,
    flexShrink: 1,
  },
  checkboxError: {
    color: Caution,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
  },
  authFormParagraph: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 25,
    marginBottom: 15,
  },
  authActionsContainer: {
    marginTop: 20,
  },
  authActionRow: {
    marginBottom: 32,
  },
  authActionText: {
    alignSelf: 'center',
    fontSize: 18,
  },
});

const AuthFormContainer = React.forwardRef<ScrollView, ScrollViewProps>(
  ({style, ...rest}, ref) => (
    <ScrollView
      ref={ref}
      keyboardShouldPersistTaps="handled"
      style={[styles.authFormContainer, style]}
      {...rest}
    />
  ),
);
AuthFormContainer.displayName = 'AuthFormContainer';

export const AuthRowContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.authRowContainer, style]} {...rest} />
  ),
);
AuthRowContainer.displayName = 'AuthRowContainer';

export const CheckboxControl = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.checkboxControl, style]} {...rest} />
  ),
);
CheckboxControl.displayName = 'CheckboxControl';

export const CheckboxLabel = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => (
    <BaseText ref={ref} style={[styles.checkboxLabel, style]} {...rest} />
  ),
);
CheckboxLabel.displayName = 'CheckboxLabel';

export const CheckboxError = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => (
    <BaseText ref={ref} style={[styles.checkboxError, style]} {...rest} />
  ),
);
CheckboxError.displayName = 'CheckboxError';

export const AuthFormParagraph = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          styles.authFormParagraph,
          {color: theme.colors.description},
          style,
        ]}
        {...rest}
      />
    );
  },
);
AuthFormParagraph.displayName = 'AuthFormParagraph';

export const AuthActionsContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.authActionsContainer, style]} {...rest} />
  ),
);
AuthActionsContainer.displayName = 'AuthActionsContainer';

export const AuthActionRow = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.authActionRow, style]} {...rest} />
  ),
);
AuthActionRow.displayName = 'AuthActionRow';

export const AuthActionText = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <BaseText
        ref={ref}
        style={[
          styles.authActionText,
          {color: theme.colors.description},
          style,
        ]}
        {...rest}
      />
    );
  },
);
AuthActionText.displayName = 'AuthActionText';

export default AuthFormContainer;
