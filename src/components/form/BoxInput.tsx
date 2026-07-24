import React, {useEffect, useState} from 'react';
import {
  AppState,
  KeyboardTypeOptions,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import TextInputMask, {TextInputMaskProps} from 'react-native-text-input-mask';
import {useTheme} from '../../contexts';
import ObfuscationHide from '../../../assets/img/obfuscation-hide.svg';
import ObfuscationShow from '../../../assets/img/obfuscation-show.svg';
import Search from '../../../assets/img/search.svg';
import {
  Black,
  Caution,
  LightBlack,
  LightBlue,
  LuckySevens,
  NeutralSlate,
  ProgressBlue,
  Slate,
  White,
} from '../../styles/colors';
import {ActiveOpacity} from '../styled/Containers';
import {BaseText} from '../styled/Text';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

type InputType = 'password' | 'phone' | 'search' | 'number';

export const INPUT_HEIGHT = 55;
export const SEPARATOR_HEIGHT = 37;

interface InputProps {
  isFocused: boolean;
  isError?: boolean;
  type?: InputType;
  disabled?: boolean;
  paddingRight?: number;
}

const styles = StyleSheet.create({
  inputContainer: {
    borderWidth: 0.75,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    padding: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
  },
  affix: {
    alignItems: 'center',
    borderWidth: 0,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    flexDirection: 'row',
  },
  separator: {
    borderRightWidth: 1,
    borderStyle: 'solid',
    height: SEPARATOR_HEIGHT,
  },
  input: {
    height: INPUT_HEIGHT,
    padding: 10,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    fontWeight: '500',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.75,
    marginBottom: 6,
  },
  errorText: {
    color: Caution,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  iconContainer: {
    alignItems: 'center',
    height: INPUT_HEIGHT,
    minWidth: INPUT_HEIGHT,
    justifyContent: 'center',
  },
});

const InputContainer: React.FC<
  InputProps & React.ComponentProps<typeof View>
> = ({isFocused, isError, disabled, paddingRight, style, ...rest}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.inputContainer,
        {borderColor: theme.dark ? LuckySevens : Slate},
        paddingRight ? {paddingRight} : null,
        isFocused
          ? {
              backgroundColor: theme.dark ? 'transparent' : '#fafbff',
              borderColor: theme.dark ? LuckySevens : Slate,
              borderBottomColor: ProgressBlue,
            }
          : null,
        isError
          ? {
              backgroundColor: theme.dark ? '#090304' : '#EF476F0A',
              borderColor: '#fbc7d1',
              borderBottomColor: Caution,
            }
          : null,
        disabled ? {borderColor: theme.dark ? LightBlack : NeutralSlate} : null,
        style,
      ]}
      {...rest}
    />
  );
};

const Affix: React.FC<React.PropsWithChildren<{}>> = ({children}) => {
  const theme = useTheme();
  return (
    <View style={[styles.affix, {backgroundColor: theme.dark ? Black : White}]}>
      {children}
    </View>
  );
};

const Separator: React.FC = () => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.separator,
        {borderRightColor: theme.dark ? '#45484E' : LightBlue},
      ]}
    />
  );
};

const Input = React.forwardRef<TextInput, InputProps & TextInputMaskProps>(
  (
    {isFocused: _isFocused, isError, disabled, type: _type, style, ...rest},
    ref,
  ) => {
    const theme = useTheme();
    return (
      <TextInputMask
        ref={ref}
        style={[
          styles.input,
          {
            backgroundColor: disabled
              ? theme.dark
                ? LightBlack
                : NeutralSlate
              : theme.dark
              ? Black
              : White,
            color: isError ? Caution : theme.colors.text,
          },
          style,
        ]}
        {...rest}
      />
    );
  },
);

const Label: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.label, {color: theme.dark ? White : LightBlack}, style]}
      {...rest}
    />
  );
};

const ErrorText: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => <BaseText style={[styles.errorText, style]} {...rest} />;

export const IconContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({activeOpacity, style, ...rest}) => (
  <TouchableOpacity
    activeOpacity={activeOpacity ?? ActiveOpacity}
    style={[styles.iconContainer, style]}
    {...rest}
  />
);

const Prefix: React.FC = ({children}) => {
  return (
    <Affix>
      {children}
      <Separator />
    </Affix>
  );
};

const Suffix: React.FC = ({children}) => {
  return (
    <Affix>
      <Separator />
      {children}
    </Affix>
  );
};

interface BoxInputProps extends TextInputProps {
  label?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onSearch?: (...args: any[]) => any;
  prefix?: () => JSX.Element;
  suffix?: () => JSX.Element;
  error?: any;
  type?: InputType;
  disabled?: boolean;
  paddingRight?: number;
}

const BoxInput = React.forwardRef<
  TextInput,
  BoxInputProps & TextInputMaskProps
>(
  (
    {
      label,
      onFocus,
      onBlur,
      onSearch,
      prefix,
      suffix,
      error,
      type,
      disabled,
      keyboardType,
      paddingRight,
      ...props
    },
    ref,
  ) => {
    const isPassword = type === 'password';
    const isSearch = type === 'search';
    const [isFocused, setIsFocused] = useState(false);
    const [isSecureTextEntry, setSecureTextEntry] = useState(isPassword);
    const _keyboardType: KeyboardTypeOptions | undefined =
      keyboardType || undefined;

    const _onFocus = () => {
      setIsFocused(true);
      onFocus && onFocus();
    };

    const _onBlur = () => {
      setIsFocused(false);
      onBlur && onBlur();
    };

    const errorMessage =
      typeof error === 'string' &&
      error.charAt(0).toUpperCase() + error.slice(1);

    if (isPassword) {
      suffix = () => (
        <IconContainer onPress={() => setSecureTextEntry(!isSecureTextEntry)}>
          {isSecureTextEntry ? <ObfuscationHide /> : <ObfuscationShow />}
        </IconContainer>
      );
    } else if (isSearch) {
      suffix = () => (
        <IconContainer onPress={() => onSearch?.()}>
          <Search />
        </IconContainer>
      );
    }

    useEffect(() => {
      const sub = AppState.addEventListener('change', state => {
        if (isPassword && (state === 'inactive' || state === 'background')) {
          props.onChangeText?.('');
        }
      });
      return () => sub.remove();
    }, [isPassword, props]);

    return (
      <>
        {label ? <Label>{label}</Label> : null}

        <InputContainer
          isFocused={isFocused}
          isError={error}
          disabled={disabled}
          paddingRight={paddingRight}>
          {prefix ? <Prefix>{prefix()}</Prefix> : null}

          <Input
            keyboardType={_keyboardType}
            placeholderTextColor={Slate}
            {...props}
            editable={!disabled}
            ref={ref}
            secureTextEntry={isPassword && isSecureTextEntry}
            onFocus={_onFocus}
            onBlur={_onBlur}
            isFocused={isFocused}
            isError={error}
            disabled={disabled}
            autoCapitalize={'none'}
            type={type}
          />

          {suffix ? <Suffix>{suffix()}</Suffix> : null}
        </InputContainer>

        {errorMessage ? <ErrorText>{errorMessage}</ErrorText> : null}
      </>
    );
  },
);

export default BoxInput;
