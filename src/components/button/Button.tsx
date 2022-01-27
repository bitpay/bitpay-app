import debounce from 'lodash.debounce';
import React from 'react';
import {BaseButtonProps} from 'react-native-gesture-handler';
import styled from 'styled-components/native';
import {
  Action,
  Air,
  Disabled,
  DisabledDark,
  Midnight,
  White,
} from '../../styles/colors';
import Haptic from '../haptic-feedback/haptic';
import {BaseText} from '../styled/Text';

type ButtonStyle = 'primary' | 'secondary' | undefined;
type ButtonType = 'link' | 'pill' | undefined;

interface ButtonProps extends BaseButtonProps {
  buttonStyle?: ButtonStyle;
  buttonType?: ButtonType;
  onPress?: () => any;
  disabled?: boolean;
  debounceTime?: number;
}

interface ButtonOptionProps {
  secondary?: boolean;
  disabled?: boolean;
}

const ACTIVE_OPACITY = 0.8;

const ButtonBaseText = styled(BaseText)`
  line-height: 25px;
  text-align: center;
`;

const ButtonContainer = styled.TouchableOpacity<ButtonOptionProps>`
  background: ${({disabled, secondary}) => {
    if (disabled) {
      return Disabled;
    }

    return secondary ? 'transparent' : Action;
  }};
  border: 2px solid
    ${({disabled, secondary, theme}) => {
      if (disabled) {
        return Disabled;
      }

      if (secondary) {
        return theme?.dark ? White : Action;
      }

      return Action;
    }};
  border-radius: 6px;
  padding: 18px;
`;

const ButtonText = styled(ButtonBaseText)<ButtonOptionProps>`
  font-size: 18px;
  font-weight: 500;

  color: ${({disabled, secondary, theme}) => {
    if (disabled) {
      return DisabledDark;
    }

    if (secondary) {
      return theme?.dark ? theme.colors.text : Action;
    }

    return White;
  }};
`;

const PillContainer = styled.TouchableOpacity<ButtonOptionProps>`
  background: ${({secondary, theme}) => {
    if (secondary) {
      return 'transparent';
    }

    return theme?.dark ? Midnight : Air;
  }};
  border: 2px solid
    ${({secondary, theme}) => {
      if (secondary) {
        return 'transparent';
      }

      return theme?.dark ? Midnight : Air;
    }};
  border-radius: 17.5px;
  padding: 8px 15px;
`;

const PillText = styled(ButtonBaseText)<ButtonOptionProps>`
  font-size: 15px;
  font-weight: 400;

  color: ${({disabled, theme}) => {
    if (disabled) {
      return DisabledDark;
    }

    return theme?.dark ? White : Action;
  }};
`;

const LinkContainer = styled.TouchableOpacity<ButtonOptionProps>`
  padding: 10px;
`;

const LinkText = styled(ButtonBaseText)<ButtonOptionProps>`
  color: ${({disabled, theme}) => {
    if (disabled) {
      return DisabledDark;
    }

    if (theme?.dark) {
      return theme.colors.text;
    }

    return Action;
  }};
`;

const Button: React.FC<ButtonProps> = ({
  onPress,
  buttonStyle,
  buttonType,
  children,
  disabled,
  debounceTime,
}) => {
  const secondary = buttonStyle === 'secondary';

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
        <LinkText disabled={disabled}>{children}</LinkText>
      </LinkContainer>
    );
  }

  if (buttonType === 'pill') {
    return (
      <PillContainer
        secondary={secondary}
        disabled={disabled}
        onPress={debouncedOnPress}
        activeOpacity={ACTIVE_OPACITY}>
        <PillText secondary={secondary} disabled={disabled}>
          {children}
        </PillText>
      </PillContainer>
    );
  }

  return (
    <ButtonContainer
      secondary={secondary}
      disabled={disabled}
      onPress={debouncedOnPress}
      activeOpacity={ACTIVE_OPACITY}
      testID={'button'}>
      <ButtonText secondary={secondary} disabled={disabled}>
        {children}
      </ButtonText>
    </ButtonContainer>
  );
};

export default Button;
