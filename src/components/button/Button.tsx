import React from 'react';
import styled, {css} from 'styled-components/native';
import {Action, Air, Disabled, DisabledDark, White} from '../../styles/colors';
import {BaseText} from '../styled/Text';
import Haptic from '../haptic-feedback/haptic';
import {BaseButtonProps} from 'react-native-gesture-handler';
type ButtonStyle = 'primary' | 'secondary' | undefined;
type ButtonType = 'link' | 'pill' | undefined;

interface ButtonProps extends BaseButtonProps {
  buttonStyle?: ButtonStyle;
  buttonType?: ButtonType;
  onPress?: () => any;
  children: string;
  disabled?: boolean;
}

interface ContainerProps {
  secondary?: boolean;
  pill?: boolean;
  disabled?: boolean;
}

interface TextProps {
  secondary?: boolean;
  pill?: boolean;
  disabled?: boolean;
}

const ButtonContainer = styled.TouchableOpacity`
  background: ${Action};
  border-radius: 6px;
  padding: 18px;
  margin: 5px 0;
  ${({secondary}: ContainerProps) =>
    secondary &&
    css`
      background: transparent;
      border: 2px solid ${Action};
      padding: 18px 28px;
    `}

  ${({pill}: ContainerProps) =>
    pill &&
    css`
      background: ${Air};
      border-radius: 17.5px;
      padding: 8px 15px;
    `}

  ${({disabled}: ContainerProps) =>
    disabled &&
    css`
      background: ${Disabled};
    `}
`;

const LinkContainer = styled.TouchableOpacity`
  padding: 10px;
`;

const Text = styled(BaseText)`
  font-weight: ${({pill}: TextProps) => (pill ? 400 : 500)};
  font-size: ${({pill}: TextProps) => (pill ? 15 : 18)}px;
  line-height: 25px;
  text-align: center;
  color: ${({secondary}: TextProps) => (secondary ? Action : White)};
  ${({disabled}: ContainerProps) =>
    disabled &&
    css`
      color: ${DisabledDark} !important;
    `}
`;

const ACTIVE_OPACITY = 0.8;

const Button = ({
  onPress,
  buttonStyle,
  buttonType,
  children,
  disabled,
}: ButtonProps) => {
  const _onPress = () => {
    if (disabled || !onPress) {
      return;
    }

    Haptic('impactLight');
    onPress();
  };

  if (buttonType === 'link') {
    return (
      <LinkContainer
        disabled={disabled}
        onPress={_onPress}
        activeOpacity={ACTIVE_OPACITY}>
        <Text secondary>{children}</Text>
      </LinkContainer>
    );
  }

  if (buttonType === 'pill') {
    return (
      <ButtonContainer
        pill
        onPress={_onPress}
        disabled={disabled}
        activeOpacity={ACTIVE_OPACITY}>
        <Text secondary pill disabled={disabled}>
          {children}
        </Text>
      </ButtonContainer>
    );
  }

  if (buttonStyle === 'secondary') {
    return (
      <ButtonContainer
        secondary
        onPress={_onPress}
        disabled={disabled}
        activeOpacity={ACTIVE_OPACITY}>
        <Text secondary disabled={disabled}>
          {children}
        </Text>
      </ButtonContainer>
    );
  }

  return (
    <ButtonContainer
      onPress={_onPress}
      disabled={disabled}
      activeOpacity={ACTIVE_OPACITY}>
      <Text disabled={disabled}>{children}</Text>
    </ButtonContainer>
  );
};

export default Button;
