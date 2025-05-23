import debounce from 'lodash.debounce';
import React, {memo, useMemo, useRef} from 'react';
import {BaseButtonProps} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import styled from 'styled-components/native';
import {
  Action,
  Air,
  Caution,
  Caution50,
  Caution60,
  Disabled,
  DisabledDark,
  DisabledText,
  DisabledTextDark,
  LightBlack,
  Midnight,
  NeutralSlate,
  SlateDark,
  Success,
  White,
} from '../../styles/colors';
import Haptic from '../haptic-feedback/haptic';
import {ActiveOpacity} from '../styled/Containers';
import {BaseText} from '../styled/Text';
import * as Icons from './ButtonIcons';
import ButtonOverlay from './ButtonOverlay';
import ButtonSpinner from './ButtonSpinner';
import {StyleProp, ViewStyle} from 'react-native';
import {
  TouchableOpacity,
  TouchableOpacityProps,
} from '@components/base/TouchableOpacity';

export type ButtonState = 'loading' | 'success' | 'failed' | null | undefined;
export type ButtonStyle =
  | 'primary'
  | 'secondary'
  | 'cancel'
  | 'danger'
  | undefined;
export type ButtonType = 'button' | 'link' | 'pill' | undefined;

interface ButtonProps extends BaseButtonProps {
  buttonStyle?: ButtonStyle;
  buttonType?: ButtonType;
  buttonOutline?: boolean;
  onPress?: () => any;
  onPressDisabled?: () => any;
  disabled?: boolean;
  debounceTime?: number;
  height?: number;
  state?: ButtonState;
  style?: StyleProp<ViewStyle>;
  action?: boolean;
  accessibilityLabel?: string;
  touchableLibrary?: TouchableOpacityProps['touchableLibrary'];
}

interface ButtonOptionProps {
  secondary?: boolean;
  outline?: boolean;
  cancel?: boolean;
  danger?: boolean;
  disabled?: boolean;
  action?: boolean;
  height?: number;
  children?: React.ReactNode;
}

export const DURATION = 100;
export const BUTTON_RADIUS = 6;
export const BUTTON_HEIGHT = 63;
export const PILL_RADIUS = 50;
export const LINK_RADIUS = 0;

const ButtonBaseText = styled(BaseText)`
  line-height: 25px;
  text-align: center;
`;

const ButtonContainer = styled(TouchableOpacity)<ButtonProps>`
  border-radius: ${({buttonType}) =>
    buttonType === 'link'
      ? LINK_RADIUS
      : buttonType === 'pill'
      ? PILL_RADIUS
      : BUTTON_RADIUS}px;
  position: relative;
  overflow: hidden;
`;

const ButtonContent = styled.View<ButtonOptionProps>`
  background: ${({disabled, theme, outline, danger, secondary}) => {
    if (disabled) {
      return theme.dark ? DisabledDark : Disabled;
    }

    if (secondary) {
      return 'transparent';
    }

    if (danger) {
      if (outline) {
        return 'transparent';
      } else {
        return theme.dark ? Caution50 : Caution60;
      }
    }

    return Action;
  }};
  border: 2px solid
    ${({danger, disabled, secondary, outline, theme}) => {
      if (disabled) {
        return theme.dark ? DisabledDark : Disabled;
      }

      if (secondary) {
        return Action;
      }

      if (danger) {
        if (outline) {
          return theme.dark ? Caution50 : Caution60;
        } else {
          return 'transparent';
        }
      }

      return Action;
    }};
  border-radius: ${BUTTON_RADIUS}px;
  height: ${({height}) => height || BUTTON_HEIGHT}px;
  justify-content: center;
`;

const ButtonText = styled(ButtonBaseText)<ButtonOptionProps>`
  font-size: 18px;
  font-weight: 500;

  color: ${({danger, disabled, secondary, outline, theme}) => {
    if (disabled) {
      return theme.dark ? DisabledTextDark : DisabledText;
    }

    if (secondary) {
      return theme?.dark ? theme.colors.text : Action;
    }

    if (danger) {
      if (outline) {
        return theme.dark ? Caution50 : Caution60;
      } else {
        return theme.dark ? Caution60 : White;
      }
    }

    return White;
  }};
`;

const PillContent = styled.View<ButtonOptionProps>`
  background: ${({
    secondary,
    cancel,
    theme,
    action,
    outline,
    danger,
    disabled,
  }) => {
    if (secondary) {
      if (outline) {
        return 'transparent';
      } else {
        return theme?.dark ? Midnight : Air;
      }
    }

    if (cancel) {
      return theme?.dark ? LightBlack : NeutralSlate;
    }

    if (danger) {
      if (outline) {
        return 'transparent';
      } else {
        return theme.dark ? Caution50 : Caution60;
      }
    }

    if (action) {
      if (disabled) {
        return theme.dark ? DisabledDark : Disabled;
      } else {
        return Action;
      }
    }

    return theme?.dark ? Midnight : Air;
  }};
  border-style: solid;
  border-width: 1px;
  border-color: ${({secondary, outline, cancel, danger, theme}) => {
    if (danger) {
      if (outline) {
        return theme.dark ? Caution50 : Caution60;
      } else {
        return 'transparent';
      }
    }

    if (secondary) {
      if (outline) {
        return theme?.dark ? White : Action;
      } else {
        return 'transparent';
      }
    }

    if (cancel) {
      return theme?.dark ? LightBlack : NeutralSlate;
    }

    return theme?.dark ? Midnight : Air;
  }};
  border-radius: ${PILL_RADIUS}px;
  padding: 8px 15px;
`;

const PillText = styled(BaseText)<ButtonOptionProps>`
  font-size: 15px;
  font-weight: 400;
  line-height: 22.03px;
  text-align: center;

  color: ${({disabled, cancel, theme, danger, outline, action}) => {
    if (disabled) {
      return theme.dark ? DisabledTextDark : DisabledText;
    }

    if (cancel) {
      return theme?.dark ? White : SlateDark;
    }

    if (action) {
      return White;
    }

    if (danger) {
      if (outline) {
        return theme.dark ? Caution50 : Caution60;
      } else {
        return theme.dark ? Caution60 : White;
      }
    }

    return theme?.dark ? White : Action;
  }};
`;

const LinkContent = styled.View<ButtonOptionProps>`
  padding: 10px;
`;

const LinkText = styled(ButtonBaseText)<ButtonOptionProps>`
  color: ${({disabled, danger, theme}) => {
    if (disabled) {
      return DisabledDark;
    }

    if (danger) {
      return theme.dark ? Caution50 : Caution60;
    }

    if (theme?.dark) {
      return theme.colors.text;
    }

    return Action;
  }};
  font-size: 18px;
  font-weight: 500;
`;

const Button: React.FC<React.PropsWithChildren<ButtonProps>> = props => {
  const {
    onPress,
    onPressDisabled,
    buttonStyle = 'primary',
    buttonType = 'button',
    buttonOutline,
    children,
    disabled,
    debounceTime,
    height,
    state,
    style,
    action,
    accessibilityLabel,
    touchableLibrary,
  } = props;
  const secondary = buttonStyle === 'secondary';
  const outline = buttonOutline;
  const cancel = buttonStyle === 'cancel';
  const danger = buttonStyle === 'danger';

  const isLoading = state === 'loading';
  const isSuccess = state === 'success';
  const isFailure = state === 'failed';
  const hideContent = !!state;

  const childOpacity = useSharedValue(1);
  childOpacity.value = withDelay(
    hideContent ? 0 : DURATION,
    withTiming(hideContent ? 0 : 1, {duration: 0, easing: Easing.linear}),
  );

  const childrenStyle = useAnimatedStyle(() => ({
    opacity: childOpacity.value,
  }));

  let ButtonTypeContainer: React.FC<ButtonOptionProps>;
  let ButtonTypeText: React.FC<ButtonOptionProps>;

  if (buttonType === 'pill') {
    ButtonTypeContainer = PillContent;
    ButtonTypeText = PillText;
  } else if (buttonType === 'link') {
    ButtonTypeContainer = LinkContent;
    ButtonTypeText = LinkText;
  } else {
    ButtonTypeContainer = ButtonContent;
    ButtonTypeText = ButtonText;
  }

  // useRef to preserve memoized debounce
  const _onPress = () => {
    if (!onPress || disabled || !!state) {
      return;
    }

    Haptic('impactLight');
    onPress();
  };
  const _onPressDisabled = () => {
    if (!onPressDisabled) {
      return;
    }

    Haptic('impactLight');
    onPressDisabled();
  };
  const onPressRef = useRef(disabled ? _onPressDisabled : _onPress);
  onPressRef.current = disabled ? _onPressDisabled : _onPress;

  const debouncedOnPress = useMemo(
    () =>
      debounce(
        () => {
          onPressRef.current();
        },
        debounceTime || 0,
        {
          leading: true,
          trailing: false,
        },
      ),
    [debounceTime],
  );

  return (
    <ButtonContainer
      touchableLibrary={touchableLibrary || 'react-native-gesture-handler'}
      accessibilityLabel={accessibilityLabel}
      style={style as any}
      buttonType={buttonType}
      onPress={debouncedOnPress}
      activeOpacity={disabled ? 1 : ActiveOpacity}
      testID={'button'}>
      <ButtonTypeContainer
        height={height}
        danger={danger}
        secondary={secondary}
        outline={outline}
        cancel={cancel}
        disabled={disabled}
        action={action}>
        <Animated.View style={childrenStyle}>
          <ButtonTypeText
            secondary={secondary}
            cancel={cancel}
            danger={danger}
            disabled={disabled}
            outline={outline}
            action={action}>
            {children}
          </ButtonTypeText>
        </Animated.View>
      </ButtonTypeContainer>

      <ButtonOverlay
        isVisible={isLoading}
        buttonStyle={buttonStyle}
        buttonType={buttonType}>
        <ButtonSpinner buttonStyle={buttonStyle} />
      </ButtonOverlay>

      <ButtonOverlay
        isVisible={isSuccess}
        buttonStyle={buttonStyle}
        buttonType={buttonType}
        backgroundColor={Success}
        animate>
        <Icons.Check buttonStyle={buttonStyle} />
      </ButtonOverlay>

      <ButtonOverlay
        isVisible={isFailure}
        buttonStyle={buttonStyle}
        buttonType={buttonType}
        backgroundColor={Caution}
        animate>
        <Icons.Close buttonStyle={buttonStyle} />
      </ButtonOverlay>
    </ButtonContainer>
  );
};

export default memo(Button);
