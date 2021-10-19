import React from 'react';
import styled, {css} from 'styled-components/native';
import {Action, Air, White} from '../../styles/colors';
import BaseText from '../base-text/BaseText';
import Haptic from '../haptic-feedback/haptic';
import {BaseButtonProps} from 'react-native-gesture-handler';
type ButtonStyle = 'primary' | 'secondary' | undefined;
type ButtonType = 'link' | 'pill' | undefined;

interface ButtonProps extends BaseButtonProps {
  buttonStyle?: ButtonStyle;
  buttonType?: ButtonType;
  onPress?: () => any;
  children: string;
}

interface ContainerProps {
  secondary?: boolean;
  pill?: boolean;
}

interface TextProps {
  secondary?: boolean;
  pill?: boolean;
}

const ButtonContainer = styled.TouchableOpacity`
  background: ${Action};
  border-radius: 12px;
  padding: 18px;
  ${({secondary}: ContainerProps) =>
    secondary &&
    css`
      background: transparent;
      border: 2px solid ${Action};
      border-radius: 6px;
      padding: 18px 28px;
    `}

  ${({pill}: ContainerProps) =>
    pill &&
    css`
      background: ${Air};
      border-radius: 17.5px;
      padding: 8px 15px;
    `}
`;

const LinkContainer = styled.TouchableOpacity`
  padding: 10px;
`;

const Text = styled(BaseText)`
  font-weight: ${({pill}: TextProps) => (pill ? 400 : 500)};
  font-size: 18px;
  line-height: 25px;
  text-align: center;
  color: ${({secondary}: TextProps) => (secondary ? Action : White)};
`;

const ACTIVE_OPACITY = 0.8;

const Button = ({onPress, buttonStyle, buttonType, children}: ButtonProps) => {
  const _onPress = () => {
    Haptic('impactLight');
    onPress && onPress();
  };

  if (buttonType === 'link') {
    return (
      <LinkContainer onPress={_onPress} activeOpacity={ACTIVE_OPACITY}>
        <Text secondary>{children}</Text>
      </LinkContainer>
    );
  }

  if (buttonType === 'pill') {
    return (
      <ButtonContainer pill onPress={_onPress} activeOpacity={ACTIVE_OPACITY}>
        <Text secondary pill>
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
        activeOpacity={ACTIVE_OPACITY}>
        <Text secondary>{children}</Text>
      </ButtonContainer>
    );
  }

  return (
    <ButtonContainer onPress={_onPress} activeOpacity={ACTIVE_OPACITY}>
      <Text>{children}</Text>
    </ButtonContainer>
  );
};

export default Button;
