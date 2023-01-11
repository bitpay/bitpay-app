import React, {useState} from 'react';
import {KeyboardTypeOptions, TextInput, TextInputProps} from 'react-native';
import TextInputMask, {TextInputMaskProps} from 'react-native-text-input-mask';
import styled, {css} from 'styled-components/native';
import ObfuscationHide from '../../../assets/img/obfuscation-hide.svg';
import ObfuscationShow from '../../../assets/img/obfuscation-show.svg';
import Search from '../../../assets/img/search.svg';
import {IS_ANDROID} from '../../constants';
import {
  Caution,
  LightBlack,
  LuckySevens,
  NeutralSlate,
  ProgressBlue,
  Slate,
  White,
} from '../../styles/colors';
import {ActiveOpacity} from '../styled/Containers';
import {BaseText} from '../styled/Text';

type InputType = 'password' | 'phone' | 'search' | 'number';

const INPUT_HEIGHT = 55;
const SEPARATOR_HEIGHT = 37;

interface InputProps {
  isFocused: boolean;
  isError?: boolean;
  type?: InputType;
  disabled?: boolean;
}

const InputContainer = styled.View<InputProps>`
  border: 0.75px solid ${({theme}) => (theme.dark ? LuckySevens : Slate)};
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  flex-direction: row;
  justify-content: center;
  position: relative;

  ${({isFocused}) =>
    isFocused &&
    css`
      background: ${({theme}) => (theme.dark ? 'transparent' : '#fafbff')};
      border-color: ${({theme}) => (theme.dark ? LuckySevens : Slate)};
      border-bottom-color: ${ProgressBlue};
    `}

  ${({isError}) =>
    isError &&
    css`
      background: ${({theme}) => (theme.dark ? '#090304' : '#EF476F0A')};
      border-color: #fbc7d1;
      border-bottom-color: ${Caution};
      color: ${Caution};
    `}

    ${({disabled}) =>
    disabled &&
    css`
      border-color: ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
    `}
`;

const Affix = styled.View`
  align-items: center;
  border: 1px solid gold;
  border-width: 0;
  flex: 0 0 auto;
  flex-direction: row;
`;

const Separator = styled.View`
  border-right-color: ${({theme}) => (theme.dark ? '#45484E' : '#eceffd')};
  border-right-width: 1px;
  border-style: solid;
  height: ${SEPARATOR_HEIGHT}px;
`;

const Input = styled(TextInputMask)<InputProps>`
  background-color: transparent;
  color: ${({theme}) => theme.colors.text};
  height: ${INPUT_HEIGHT}px;
  padding: 10px;
  flex: 1 1 auto;
  font-weight: 500;

  ${({isError}) =>
    isError &&
    css`
      color: ${Caution};
    `}

  ${({disabled}) =>
    disabled &&
    css`
      background: ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
    `}
`;

const Label = styled(BaseText)`
  color: ${({theme}) => (theme.dark ? White : LightBlack)};
  font-size: 13px;
  font-weight: 500;
  opacity: 0.75;
  margin-bottom: 6px;
`;

const ErrorText = styled(BaseText)`
  color: ${Caution};
  font-size: 12px;
  font-weight: 500;
  margin-top: 4px;
`;

export const IconContainer = styled.TouchableOpacity.attrs(() => ({
  activeOpacity: ActiveOpacity,
}))`
  align-items: center;
  height: ${INPUT_HEIGHT}px;
  min-width: ${INPUT_HEIGHT}px;
  justify-content: center;
`;

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
      ...props
    },
    ref,
  ) => {
    const isPassword = type === 'password';
    const isSearch = type === 'search';
    const [isFocused, setIsFocused] = useState(false);
    const [isSecureTextEntry, setSecureTextEntry] = useState(isPassword);
    const _keyboardType: KeyboardTypeOptions | undefined =
      isPassword && !isSecureTextEntry && IS_ANDROID
        ? 'visible-password'
        : keyboardType || undefined;

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

    return (
      <>
        {label ? <Label>{label}</Label> : null}

        <InputContainer
          isFocused={isFocused}
          isError={error}
          disabled={disabled}>
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
