import React from 'react';
import {StyleSheet, View, ViewProps} from 'react-native';
import FastImage, {FastImageProps} from 'react-native-fast-image';
import {useTheme} from '../../../../../contexts';
import {BaseText} from '../../../../../components/styled/Text';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const styles = StyleSheet.create({
  rowDataContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cryptoAmountContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  cryptoTitle: {
    color: '#667',
  },
  cryptoContainer: {
    display: 'flex',
    flexDirection: 'row',
  },
  cryptoAmount: {
    fontSize: 35,
  },
  cryptoUnit: {
    fontSize: 15,
    paddingTop: 7,
    paddingLeft: 5,
  },
  iconContainer: {
    height: 40,
    width: 40,
  },
  rowLabel: {
    fontSize: 14,
  },
  rowData: {
    fontSize: 16,
    color: '#9b9bab',
  },
  labelTip: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  columnDataContainer: {
    marginTop: 20,
  },
  columnData: {
    fontSize: 16,
    color: '#9b9bab',
    paddingTop: 10,
  },
  copyImgContainerRight: {
    marginLeft: 5,
    paddingTop: 8,
  },
  copiedContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  removeCta: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 60,
    marginTop: 30,
  },
  externalServiceContainer: {
    paddingHorizontal: 15,
  },
});

export const RowDataContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.rowDataContainer, style]} {...rest} />
  ),
);
RowDataContainer.displayName = 'RowDataContainer';

export const CryptoAmountContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.cryptoAmountContainer, style]} {...rest} />
  ),
);
CryptoAmountContainer.displayName = 'CryptoAmountContainer';

export const CryptoTitle = React.forwardRef<
  React.ComponentRef<typeof BaseText>,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.cryptoTitle, style]} {...rest} />
));
CryptoTitle.displayName = 'CryptoTitle';

export const CryptoContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.cryptoContainer, style]} {...rest} />
  ),
);
CryptoContainer.displayName = 'CryptoContainer';

export const CryptoAmount = React.forwardRef<
  React.ComponentRef<typeof BaseText>,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.cryptoAmount, style]} {...rest} />
));
CryptoAmount.displayName = 'CryptoAmount';

export const CryptoUnit = React.forwardRef<
  React.ComponentRef<typeof BaseText>,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.cryptoUnit, style]} {...rest} />
));
CryptoUnit.displayName = 'CryptoUnit';

export const IconContainer: React.FC<FastImageProps> = ({style, ...rest}) => (
  <FastImage style={[styles.iconContainer, style]} {...rest} />
);

export const RowLabel = React.forwardRef<
  React.ComponentRef<typeof BaseText>,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.rowLabel, style]} {...rest} />
));
RowLabel.displayName = 'RowLabel';

export const RowData = React.forwardRef<
  React.ComponentRef<typeof BaseText>,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.rowData, style]} {...rest} />
));
RowData.displayName = 'RowData';

export const LabelTip = React.forwardRef<View, ViewProps & {type?: string}>(
  ({type, style, ...rest}, ref) => {
    const {dark: isDark} = useTheme();
    let backgroundColor: string | undefined;
    switch (type) {
      case 'warn':
        backgroundColor = isDark ? 'rgba(56, 56, 56, 0.8)' : '#fff7f2';
        break;
      case 'info':
        backgroundColor = isDark ? 'rgba(56, 56, 56, 0.8)' : '#eff1f8';
        break;
    }
    return (
      <View
        ref={ref}
        style={[styles.labelTip, {backgroundColor}, style]}
        {...rest}
      />
    );
  },
);
LabelTip.displayName = 'LabelTip';

export const LabelTipText = React.forwardRef<
  React.ComponentRef<typeof BaseText>,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        {color: theme.dark ? 'rgba(255, 255, 255, 0.6)' : '#4a4a4a'},
        style,
      ]}
      {...rest}
    />
  );
});
LabelTipText.displayName = 'LabelTipText';

export const ColumnDataContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.columnDataContainer, style]} {...rest} />
  ),
);
ColumnDataContainer.displayName = 'ColumnDataContainer';

export const ColumnData = React.forwardRef<
  React.ComponentRef<typeof BaseText>,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.columnData, style]} {...rest} />
));
ColumnData.displayName = 'ColumnData';

export const CopyImgContainerRight = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.copyImgContainerRight, style]} {...rest} />
  ),
);
CopyImgContainerRight.displayName = 'CopyImgContainerRight';

export const CopiedContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.copiedContainer, style]} {...rest} />
  ),
);
CopiedContainer.displayName = 'CopiedContainer';

export const RemoveCta: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.removeCta, style]} {...rest} />
);

export const ExternalServiceContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View
      ref={ref}
      style={[styles.externalServiceContainer, style]}
      {...rest}
    />
  ),
);
ExternalServiceContainer.displayName = 'ExternalServiceContainer';
