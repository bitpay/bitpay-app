import React from 'react';
import {Platform, StyleSheet, Text, TextProps} from 'react-native';
import {useTheme} from '../../../contexts';
import {BaseText, H7} from '../../../components/styled/Text';

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '500',
    lineHeight: 18,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  iconLabel: {
    marginRight: 12,
    marginLeft: 6,
    marginTop: Platform.OS === 'ios' ? 2 : 0,
  },
});

export const HeaderTitle = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <BaseText
        ref={ref}
        style={[styles.headerTitle, {color: theme.colors.text}, style]}
        {...rest}
      />
    );
  },
);
HeaderTitle.displayName = 'HeaderTitle';

export const IconLabel = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <H7
        ref={ref}
        style={[styles.iconLabel, {color: theme.colors.text}, style]}
        {...rest}
      />
    );
  },
);
IconLabel.displayName = 'IconLabel';
