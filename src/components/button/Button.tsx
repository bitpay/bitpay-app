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
  Disabled,
  DisabledDark,
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
  disabled?: boolean;
  debounceTime?: number;
  height?: number;
  state?: ButtonState;
  style?: StyleProp<ViewStyle>;
  action?: boolean;
  accessibilityLabel?: string;
}

interface ButtonOptionProps {
  secondary?: boolean;
  outline?: boolean;
  cancel?: boolean;
  danger?: boolean;
  disabled?: boolean;
  action?: boolean;
  height?: number;
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

const ButtonContainer = styled.TouchableOpacity<ButtonProps>`
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
  background: ${({danger, disabled, theme, secondary}) => {
    if (secondary) {
      return 'transparent';
    }

    if (disabled) {
      return theme.dark ? DisabledDark : Disabled;
    }

    if (danger) {
      return theme.dark ? '#8B1C1C' : '#FFCDCD';
    }

    return Action;
  }};
  border: 2px solid
    ${({danger, disabled, secondary, theme}) => {
      if (disabled) {
        return theme.dark ? DisabledDark : Disabled;
      }

      if (secondary) {
        return Action;
      }

      if (danger) {
        return theme.dark ? '#8B1C1C' : '#FFCDCD';
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

  color: ${({danger, disabled, secondary, theme}) => {
    if (disabled) {
      return theme.dark ? '#656565' : '#bebec0';
    }

    if (secondary) {
      return theme?.dark ? theme.colors.text : Action;
    }

    if (danger) {
      return theme.dark ? White : '#8B1C1C';
    }

    return White;
  }};
`;

const PillContent = styled.View<ButtonOptionProps>`
  background: ${({secondary, cancel, theme, action}) => {
    if (secondary) {
      return 'transparent';
    }

    if (cancel) {
      return theme?.dark ? LightBlack : NeutralSlate;
    }

    if (action) {
      return Action;
    }

    return theme?.dark ? Midnight : Air;
  }};
  border-style: solid;
  border-width: 1px;
  border-color: ${({secondary, outline, cancel, theme}) => {
    if (outline) {
      return theme?.dark ? White : Action;
    }

    if (secondary) {
      return 'transparent';
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

  color: ${({disabled, cancel, theme, action}) => {
    if (disabled) {
      return DisabledDark;
    }

    if (cancel) {
      return theme?.dark ? White : SlateDark;
    }

    if (action) {
      return White;
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

    if (theme?.dark) {
      return theme.colors.text;
    }

    if (danger) {
      return Caution;
    }

    return Action;
  }};
  font-size: 18px;
  font-weight: 500;
`;

const Button: React.FC<React.PropsWithChildren<ButtonProps>> = props => {
  const {
    onPress,
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
  const onPressRef = useRef(_onPress);
  onPressRef.current = _onPress;

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
      accessibilityLabel={accessibilityLabel}
      style={style}
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
