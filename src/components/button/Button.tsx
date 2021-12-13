import debounce from 'lodash.debounce';
import React from 'react';
import {BaseButtonProps} from 'react-native-gesture-handler';
import styled, {css} from 'styled-components/native';
import {Action, Air, Disabled, DisabledDark, White} from '../../styles/colors';
import {BitPayTheme} from '../../themes/bitpay';
import Haptic from '../haptic-feedback/haptic';
import {BaseText} from '../styled/Text';

type ButtonStyle = 'primary' | 'secondary' | undefined;
type ButtonType = 'link' | 'pill' | undefined;

interface ButtonProps extends BaseButtonProps {
  theme?: BitPayTheme;
  buttonStyle?: ButtonStyle;
  buttonType?: ButtonType;
  onPress?: () => any;
  children: string;
  disabled?: boolean;
  debounceTime?: number;
}

interface ContainerProps {
  secondary?: boolean;
  pill?: boolean;
  disabled?: boolean;
}

interface TextProps {
  theme?: BitPayTheme;
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

const Text = styled(BaseText)<TextProps>`
  font-weight: ${({pill}) => (pill ? 400 : 500)};
  font-size: ${({pill}) => (pill ? 15 : 18)}px;
  line-height: 25px;
  text-align: center;
  color: ${({theme, secondary}) =>
    secondary ? (theme && theme.dark ? theme.colors.text : Action) : White};
  ${({disabled}) =>
    disabled &&
    css`
      color: ${DisabledDark} !important;
    `}
`;

const ACTIVE_OPACITY = 0.8;

const Button = ({
  theme,
  onPress,
  buttonStyle,
  buttonType,
  children,
  disabled,
  debounceTime,
}: ButtonProps) => {
  const _onPress = () => {
    if (disabled || !onPress) {
      return;
    }

    Haptic('impactLight');
    onPress();
  };

  const debouncedOnPress = debounce(_onPress, debounceTime || 0, {
    leading: true,
    trailing: false,
  });

  if (buttonType === 'link') {
    return (
      <LinkContainer
        disabled={disabled}
        onPress={debouncedOnPress}
        activeOpacity={ACTIVE_OPACITY}>
        <Text theme={theme} secondary>
          {children}
        </Text>
      </LinkContainer>
    );
  }

  if (buttonType === 'pill') {
    return (
      <ButtonContainer
        pill
        onPress={debouncedOnPress}
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
        onPress={debouncedOnPress}
        disabled={disabled}
        activeOpacity={ACTIVE_OPACITY}>
        <Text theme={theme} secondary disabled={disabled}>
          {children}
        </Text>
      </ButtonContainer>
    );
  }

  return (
    <ButtonContainer
      onPress={debouncedOnPress}
      disabled={disabled}
      activeOpacity={ACTIVE_OPACITY}
      testID={'button'}>
      <Text disabled={disabled}>{children}</Text>
    </ButtonContainer>
  );
};

export default Button;
