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
  Midnight,
  Success,
  White,
} from '../../styles/colors';
import Haptic from '../haptic-feedback/haptic';
import {ActiveOpacity} from '../styled/Containers';
import {BaseText} from '../styled/Text';
import * as Icons from './ButtonIcons';
import ButtonOverlay from './ButtonOverlay';
import ButtonSpinner from './ButtonSpinner';

export type ButtonState = 'loading' | 'success' | 'failed' | null | undefined;
export type ButtonStyle = 'primary' | 'secondary' | undefined;
export type ButtonType = 'button' | 'link' | 'pill' | undefined;

interface ButtonProps extends BaseButtonProps {
  buttonStyle?: ButtonStyle;
  buttonType?: ButtonType;
  onPress?: () => any;
  disabled?: boolean;
  debounceTime?: number;
  state?: ButtonState;
}

interface ButtonOptionProps {
  secondary?: boolean;
  disabled?: boolean;
}

export const DURATION = 100;
export const BUTTON_RADIUS = 6;
export const PILL_RADIUS = 17.5;
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
  background: ${({disabled, theme, secondary}) => {
    if (secondary) {
      return 'transparent';
    }

    if (disabled) {
      return theme.dark ? DisabledDark : Disabled;
    }

    return Action;
  }};
  border: 2px solid
    ${({disabled, secondary, theme}) => {
      if (disabled) {
        return theme.dark ? DisabledDark : Disabled;
      }

      if (secondary) {
        return Action;
      }

      return Action;
    }};
  border-radius: ${BUTTON_RADIUS}px;
  padding: 18px;
`;

const ButtonText = styled(ButtonBaseText)<ButtonOptionProps>`
  font-size: 18px;
  font-weight: 500;

  color: ${({disabled, secondary, theme}) => {
    if (disabled) {
      return theme.dark ? '#656565' : '#bebec0';
    }

    if (secondary) {
      return theme?.dark ? theme.colors.text : Action;
    }

    return White;
  }};
`;

const PillContent = styled.View<ButtonOptionProps>`
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
  border-radius: ${PILL_RADIUS}px;
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

const LinkContent = styled.View<ButtonOptionProps>`
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

const Button: React.FC<React.PropsWithChildren<ButtonProps>> = props => {
  const {
    onPress,
    buttonStyle = 'primary',
    buttonType = 'button',
    children,
    disabled,
    debounceTime,
    state,
  } = props;
  const secondary = buttonStyle === 'secondary';

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
  const onPressRef = useRef(() => {});
  onPressRef.current = () => {
    if (!onPress || disabled || !!state) {
      return;
    }

    Haptic('impactLight');
    onPress();
  };

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
      buttonType={buttonType}
      onPress={debouncedOnPress}
      activeOpacity={disabled ? 1 : ActiveOpacity}
      testID={'button'}>
      <ButtonTypeContainer secondary={secondary} disabled={disabled}>
        <Animated.View style={childrenStyle}>
          <ButtonTypeText secondary={secondary} disabled={disabled}>
            {children}
          </ButtonTypeText>
        </Animated.View>
      </ButtonTypeContainer>

      <ButtonOverlay
        isVisible={isLoading}
        buttonStyle={buttonStyle}
        buttonType={buttonType}>
        <ButtonSpinner />
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
