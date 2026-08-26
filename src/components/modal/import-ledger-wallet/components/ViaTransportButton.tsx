import React from 'react';
import {StyleSheet, TouchableOpacityProps, View} from 'react-native';
import {useTheme} from '../../../../contexts';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {BaseButtonProps} from 'react-native-gesture-handler';
import {ActiveOpacity} from '../../../../components/styled/Containers';
import {Action, White} from '../../../../styles/colors';
import {BUTTON_HEIGHT, BUTTON_RADIUS} from '../../../button/Button';
import {BaseText} from '../../../styled/Text';
import {BluetoothLogo, UsbLogo} from './Logos';

const styles = StyleSheet.create({
  buttonIcon: {
    marginBottom: 2,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 8,
  },
  connectButton: {
    borderRadius: BUTTON_RADIUS,
    borderWidth: 2,
    minHeight: BUTTON_HEIGHT,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 16,
  },
});

type ButtonTypeProps = {
  secondary?: boolean;
};

type CombinedButtonProps = BaseButtonProps & ButtonTypeProps;

const ButtonText: React.FC<
  ButtonTypeProps & React.ComponentProps<typeof BaseText>
> = ({secondary, style, ...rest}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.buttonText,
        {color: theme.dark || !secondary ? White : Action},
        style,
      ]}
      {...rest}
    />
  );
};

type ViaTransportButtonProps = TouchableOpacityProps & CombinedButtonProps;

const ConnectButton: React.FC<
  ViaTransportButtonProps & {
    style?: React.ComponentProps<typeof TouchableOpacity>['style'];
  }
> = ({secondary, style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.connectButton,
        {
          backgroundColor: secondary ? 'transparent' : Action,
          borderColor: theme.dark && secondary ? White : Action,
        },
        style,
      ]}
      {...(rest as any)}
    />
  );
};

export const ViaBluetoothButton: React.FC<ViaTransportButtonProps> = props => {
  const {children, secondary, ...rest} = props;
  const logoFill = secondary ? Action : White;

  return (
    <ConnectButton
      activeOpacity={ActiveOpacity}
      testID="ledger-connect-bluetooth-button"
      accessibilityLabel="Connect via Bluetooth"
      secondary={secondary}
      {...rest}>
      <View style={styles.buttonIcon}>
        <BluetoothLogo fill={logoFill} />
      </View>

      <ButtonText secondary={secondary}>{children}</ButtonText>
    </ConnectButton>
  );
};

export const ViaUsbButton: React.FC<ViaTransportButtonProps> = props => {
  const theme = useTheme();
  const {children, secondary, ...rest} = props;
  const logoFill = theme.dark || !secondary ? White : Action;

  return (
    <ConnectButton
      activeOpacity={ActiveOpacity}
      testID="ledger-connect-usb-button"
      accessibilityLabel="Connect via USB"
      secondary={secondary}
      {...rest}>
      <View style={styles.buttonIcon}>
        <UsbLogo fill={logoFill} />
      </View>

      <ButtonText secondary={secondary}>{children}</ButtonText>
    </ConnectButton>
  );
};
