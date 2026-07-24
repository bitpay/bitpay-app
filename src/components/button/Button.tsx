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
import {useTheme} from '../../contexts';
import {StyleProp, StyleSheet, TextStyle, View, ViewStyle} from 'react-native';
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
import {
  TouchableOpacity,
  TouchableOpacityProps,
} from '@components/base/TouchableOpacity';
import type {BitPayTheme} from '../../themes/bitpay';

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
  backgroundColor?: string;
  borderRadius?: number;
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
  icon?: React.ReactNode;
}

interface ButtonOptionProps {
  secondary?: boolean;
  backgroundColor?: string;
  borderRadius?: number;
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

const styles = StyleSheet.create({
  buttonBaseText: {
    lineHeight: 25,
    textAlign: 'center',
  },
  buttonContent: {
    borderWidth: 2,
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '500',
  },
  buttonIconContainer: {
    marginRight: 10,
  },
  pillContent: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderRadius: PILL_RADIUS,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  pillText: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22.03,
    textAlign: 'center',
  },
  linkContent: {
    padding: 10,
  },
  linkText: {
    fontSize: 18,
    fontWeight: '500',
  },
});

const ButtonBaseText: React.FC<
  React.PropsWithChildren<{style?: StyleProp<TextStyle>}>
> = ({style, ...rest}) => (
  <BaseText style={[styles.buttonBaseText, style]} {...rest} />
);

type ButtonContainerProps = Pick<ButtonProps, 'buttonType' | 'borderRadius'> &
  TouchableOpacityProps;

const ButtonContainer: React.FC<
  React.PropsWithChildren<ButtonContainerProps>
> = ({borderRadius, buttonType, style, children, ...rest}) => {
  const computedBorderRadius =
    borderRadius ??
    (buttonType === 'link'
      ? LINK_RADIUS
      : buttonType === 'pill'
      ? PILL_RADIUS
      : BUTTON_RADIUS);
  return (
    <TouchableOpacity
      style={[
        {
          borderRadius: computedBorderRadius,
          position: 'relative',
          overflow: 'hidden',
        },
        style,
      ]}
      {...rest}>
      {children}
    </TouchableOpacity>
  );
};

const getButtonContentBackground = ({
  disabled,
  theme,
  outline,
  danger,
  secondary,
  backgroundColor,
}: ButtonOptionProps & {theme: BitPayTheme}): string => {
  if (disabled) {
    return theme.dark ? DisabledDark : Disabled;
  }
  if (secondary) {
    return 'transparent';
  }
  if (danger) {
    return outline ? 'transparent' : theme.dark ? Caution50 : Caution60;
  }
  if (backgroundColor) {
    return backgroundColor;
  }
  return Action;
};

const getButtonContentBorderColor = ({
  danger,
  disabled,
  secondary,
  outline,
  theme,
  backgroundColor,
}: ButtonOptionProps & {theme: BitPayTheme}): string => {
  if (disabled) {
    return theme.dark ? DisabledDark : Disabled;
  }
  if (secondary) {
    return backgroundColor || Action;
  }
  if (danger) {
    return outline ? (theme.dark ? Caution50 : Caution60) : 'transparent';
  }
  if (backgroundColor) {
    return backgroundColor;
  }
  return Action;
};

const ButtonContent: React.FC<ButtonOptionProps> = ({
  height,
  danger,
  secondary,
  outline,
  disabled,
  backgroundColor,
  borderRadius,
  children,
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.buttonContent,
        {
          backgroundColor: getButtonContentBackground({
            disabled,
            theme,
            outline,
            danger,
            secondary,
            backgroundColor,
          }),
          borderColor: getButtonContentBorderColor({
            danger,
            disabled,
            secondary,
            outline,
            theme,
            backgroundColor,
          }),
          borderRadius: borderRadius ?? BUTTON_RADIUS,
          height: height || BUTTON_HEIGHT,
        },
      ]}>
      {children}
    </View>
  );
};

const getButtonTextColor = ({
  danger,
  disabled,
  secondary,
  outline,
  theme,
}: ButtonOptionProps & {theme: BitPayTheme}): string => {
  if (disabled) {
    return theme.dark ? DisabledTextDark : DisabledText;
  }
  if (secondary) {
    return theme?.dark ? theme.colors.text : Action;
  }
  if (danger) {
    return outline
      ? theme.dark
        ? Caution50
        : Caution60
      : theme.dark
      ? Caution60
      : White;
  }
  return White;
};

const ButtonText: React.FC<ButtonOptionProps> = ({
  danger,
  disabled,
  secondary,
  outline,
  children,
}) => {
  const theme = useTheme();
  return (
    <ButtonBaseText
      style={[
        styles.buttonText,
        {color: getButtonTextColor({danger, disabled, secondary, outline, theme})},
      ]}>
      {children}
    </ButtonBaseText>
  );
};

const ButtonIconContainer: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => <View style={styles.buttonIconContainer}>{children}</View>;

const ButtonContainerFlex: React.FC<
  React.PropsWithChildren<{hasIcon: boolean}>
> = ({hasIcon, children}) => (
  <View
    style={{
      flexDirection: 'row',
      justifyContent: hasIcon ? 'space-between' : 'center',
      paddingLeft: hasIcon ? 10 : 0,
      alignItems: 'center',
    }}>
    {children}
  </View>
);

const ButtonTextContainer: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => <View>{children}</View>;

const getPillBackground = ({
  secondary,
  cancel,
  theme,
  action,
  outline,
  danger,
  disabled,
}: ButtonOptionProps & {theme: BitPayTheme}): string => {
  if (secondary) {
    return outline ? 'transparent' : theme?.dark ? Midnight : Air;
  }
  if (cancel) {
    return theme?.dark ? LightBlack : NeutralSlate;
  }
  if (danger) {
    return outline ? 'transparent' : theme.dark ? Caution50 : Caution60;
  }
  if (action) {
    return disabled ? (theme.dark ? DisabledDark : Disabled) : Action;
  }
  return theme?.dark ? Midnight : Air;
};

const getPillBorderColor = ({
  secondary,
  outline,
  cancel,
  danger,
  theme,
}: ButtonOptionProps & {theme: BitPayTheme}): string => {
  if (danger) {
    return outline ? (theme.dark ? Caution50 : Caution60) : 'transparent';
  }
  if (secondary) {
    return outline ? (theme?.dark ? White : Action) : 'transparent';
  }
  if (cancel) {
    return theme?.dark ? LightBlack : NeutralSlate;
  }
  return theme?.dark ? Midnight : Air;
};

const PillContent: React.FC<ButtonOptionProps> = ({
  secondary,
  cancel,
  action,
  outline,
  danger,
  disabled,
  children,
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.pillContent,
        {
          backgroundColor: getPillBackground({
            secondary,
            cancel,
            theme,
            action,
            outline,
            danger,
            disabled,
          }),
          borderColor: getPillBorderColor({
            secondary,
            outline,
            cancel,
            danger,
            theme,
          }),
        },
      ]}>
      {children}
    </View>
  );
};

const getPillTextColor = ({
  disabled,
  cancel,
  theme,
  danger,
  outline,
  action,
}: ButtonOptionProps & {theme: BitPayTheme}): string => {
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
    return outline
      ? theme.dark
        ? Caution50
        : Caution60
      : theme.dark
      ? Caution60
      : White;
  }
  return theme?.dark ? White : Action;
};

const PillText: React.FC<ButtonOptionProps> = ({
  disabled,
  cancel,
  danger,
  outline,
  action,
  children,
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.pillText,
        {
          color: getPillTextColor({
            disabled,
            cancel,
            theme,
            danger,
            outline,
            action,
          }),
        },
      ]}>
      {children}
    </BaseText>
  );
};

const LinkContent: React.FC<React.PropsWithChildren<{}>> = ({children}) => (
  <View style={styles.linkContent}>{children}</View>
);

const getLinkTextColor = ({
  disabled,
  danger,
  theme,
}: ButtonOptionProps & {theme: BitPayTheme}): string => {
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
};

const LinkText: React.FC<ButtonOptionProps> = ({disabled, danger, children}) => {
  const theme = useTheme();
  return (
    <ButtonBaseText
      style={[styles.linkText, {color: getLinkTextColor({disabled, danger, theme})}]}>
      {children}
    </ButtonBaseText>
  );
};

const Button: React.FC<React.PropsWithChildren<ButtonProps>> = props => {
  const {
    onPress,
    onPressDisabled,
    buttonStyle = 'primary',
    buttonType = 'button',
    buttonOutline,
    backgroundColor,
    borderRadius,
    children,
    disabled,
    debounceTime,
    height,
    state,
    style,
    action,
    accessibilityLabel,
    touchableLibrary,
    icon,
    testID,
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
      testID={testID || 'button'}>
      <ButtonTypeContainer
        height={height}
        danger={danger}
        secondary={secondary}
        outline={outline}
        cancel={cancel}
        disabled={disabled}
        action={action}
        backgroundColor={backgroundColor}
        borderRadius={borderRadius}>
        <Animated.View style={childrenStyle}>
          <ButtonContainerFlex hasIcon={!!icon}>
            <ButtonTextContainer>
              <ButtonTypeText
                secondary={secondary}
                cancel={cancel}
                danger={danger}
                disabled={disabled}
                outline={outline}
                action={action}>
                {children}
              </ButtonTypeText>
            </ButtonTextContainer>
            {icon && <ButtonIconContainer>{icon}</ButtonIconContainer>}
          </ButtonContainerFlex>
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
