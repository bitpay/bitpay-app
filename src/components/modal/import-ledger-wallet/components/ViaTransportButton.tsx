import styled, {useTheme} from 'styled-components/native';
import {TouchableOpacity, TouchableOpacityProps} from 'react-native';
import {BaseButtonProps} from 'react-native-gesture-handler';
import {ActiveOpacity} from '../../../../components/styled/Containers';
import {Action, White} from '../../../../styles/colors';
import {BUTTON_HEIGHT, BUTTON_RADIUS} from '../../../button/Button';
import {BaseText} from '../../../styled/Text';
import {BluetoothLogo, UsbLogo} from './Logos';

const ButtonIcon = styled.View`
  margin-bottom: 2px;
`;

type ButtonTypeProps = {
  secondary?: boolean;
};

type CombinedButtonProps = BaseButtonProps & ButtonTypeProps;

const ButtonText = styled(BaseText)<ButtonTypeProps>`
  color: ${({secondary, theme}) => (theme.dark || !secondary ? White : Action)}
  font-size: 18px;
  font-weight: 500;
  margin-left: 8px;
`;

const ConnectButton = styled(TouchableOpacity)<CombinedButtonProps>`
  background-color: ${({secondary}) => (secondary ? 'transparent' : Action)};
  border-radius: ${BUTTON_RADIUS}px;
  border: 2px solid
    ${({secondary, theme}) => (theme.dark && secondary ? White : Action)};
  min-height: ${BUTTON_HEIGHT}px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  margin-top: 16px;
`;

type ViaTransportButtonProps = TouchableOpacityProps & CombinedButtonProps;

export const ViaBluetoothButton: React.FC<ViaTransportButtonProps> = props => {
  const {children, secondary, ...rest} = props;
  const logoFill = secondary ? Action : White;

  return (
    <ConnectButton
      activeOpacity={ActiveOpacity}
      secondary={secondary}
      {...rest}>
      <ButtonIcon>
        <BluetoothLogo fill={logoFill} />
      </ButtonIcon>

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
      secondary={secondary}
      {...rest}>
      <ButtonIcon>
        <UsbLogo fill={logoFill} />
      </ButtonIcon>

      <ButtonText secondary={secondary}>{children}</ButtonText>
    </ConnectButton>
  );
};
