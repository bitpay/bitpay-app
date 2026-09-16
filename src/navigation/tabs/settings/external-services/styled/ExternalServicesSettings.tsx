import React from 'react';
import {StyleSheet, View, ViewProps} from 'react-native';
import {BaseText} from '../../../../../components/styled/Text';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const styles = StyleSheet.create({
  noPrMsg: {
    fontSize: 15,
    textAlign: 'center',
  },
  prTitle: {
    fontSize: 18,
    fontWeight: '500',
  },
  prRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60,
  },
  prRowLeft: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  prRowRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  prTxtCryptoAmount: {
    fontWeight: '700',
  },
  prTxtDate: {
    fontSize: 12.5,
    color: '#667',
  },
  prTxtFiatAmount: {
    fontSize: 14,
  },
  prTxtStatus: {
    fontSize: 12.5,
  },
  footerSupport: {
    paddingTop: 20,
    paddingBottom: 30,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  supportTxt: {
    fontSize: 12.5,
    color: '#667',
  },
});

export const NoPrMsg = React.forwardRef<
  React.ComponentRef<typeof BaseText>,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.noPrMsg, style]} {...rest} />
));
NoPrMsg.displayName = 'NoPrMsg';

export const PrTitle = React.forwardRef<
  React.ComponentRef<typeof BaseText>,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.prTitle, style]} {...rest} />
));
PrTitle.displayName = 'PrTitle';

export const PrRow: React.FC<React.ComponentProps<typeof TouchableOpacity>> = ({
  style,
  ...rest
}) => <TouchableOpacity style={[styles.prRow, style]} {...rest} />;

export const PrRowLeft = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.prRowLeft, style]} {...rest} />
  ),
);
PrRowLeft.displayName = 'PrRowLeft';

export const PrRowRight = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.prRowRight, style]} {...rest} />
  ),
);
PrRowRight.displayName = 'PrRowRight';

export const PrTxtCryptoAmount = React.forwardRef<
  React.ComponentRef<typeof BaseText>,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.prTxtCryptoAmount, style]} {...rest} />
));
PrTxtCryptoAmount.displayName = 'PrTxtCryptoAmount';

export const PrTxtDate = React.forwardRef<
  React.ComponentRef<typeof BaseText>,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.prTxtDate, style]} {...rest} />
));
PrTxtDate.displayName = 'PrTxtDate';

export const PrTxtFiatAmount = React.forwardRef<
  React.ComponentRef<typeof BaseText>,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.prTxtFiatAmount, style]} {...rest} />
));
PrTxtFiatAmount.displayName = 'PrTxtFiatAmount';

export const PrTxtStatus = React.forwardRef<
  React.ComponentRef<typeof BaseText>,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.prTxtStatus, style]} {...rest} />
));
PrTxtStatus.displayName = 'PrTxtStatus';

export const FooterSupport = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.footerSupport, style]} {...rest} />
  ),
);
FooterSupport.displayName = 'FooterSupport';

export const SupportTxt = React.forwardRef<
  React.ComponentRef<typeof BaseText>,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.supportTxt, style]} {...rest} />
));
SupportTxt.displayName = 'SupportTxt';
