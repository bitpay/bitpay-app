import React, {useState} from 'react';
import {TextInput, TextInputProps} from 'react-native';
import TextInputMask from 'react-native-text-input-mask';
import styled, {css} from 'styled-components/native';
import ObfuscationHide from '../../../assets/img/obfuscation-hide.svg';
import ObfuscationShow from '../../../assets/img/obfuscation-show.svg';
import Search from '../../../assets/img/search.svg';
import {
  Caution,
  LightBlack,
  ProgressBlue,
  Slate,
  White,
} from '../../styles/colors';
import {BaseText} from '../styled/Text';

type InputType = 'password' | 'phone' | 'search';

interface InputProps {
  isFocused: boolean;
  isError?: boolean;
  type?: InputType;
}

const InputContainer = styled.View`
  justify-content: center;
  position: relative;
`;

const Input = styled(TextInputMask)<InputProps>`
  border: 0.75px solid ${Slate};
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  color: ${({theme}) => theme.colors.text};
  height: 55px;
  padding: 10px;
  ${({type}) => (type === 'phone' ? 'padding: 0 10px 2px 95px' : '')};
  padding-right: ${({type}) => (type === 'search' ? 65 : 40)}px;

  font-weight: 500;
  ${({isFocused}) =>
    isFocused &&
    css`
      background: ${({theme}) => (theme.dark ? 'transparent' : '#fafbff')};
      border-color: ${Slate};
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

const ObfuscationToggle = styled.TouchableOpacity`
  position: absolute;
  right: 10px;
`;

const SearchIconContainer = styled.View`
  position: absolute;
  right: 0;
  top: 31px;
  border-left-color: ${({theme}) => (theme.dark ? '#45484E' : '#eceffd')};
  border-left-width: 1px;
  padding: 5px 15px;
`;

interface BoxInputProps extends TextInputProps {
  label?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  icon?: () => JSX.Element;
  error?: any;
  type?: InputType;
}

const BoxInput = React.forwardRef<TextInput, BoxInputProps>(
  ({label, onFocus, onBlur, icon, error, type, ...props}, ref) => {
    const isPassword = type === 'password';
    const isSearch = type === 'search';
    const [isFocused, setIsFocused] = useState(false);
    const [isSecureTextEntry, setSecureTextEntry] = useState(isPassword);

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

    return (
      <>
        {label ? <Label>{label}</Label> : null}

        <InputContainer>
          <Input
            {...props}
            ref={ref}
            secureTextEntry={isPassword && isSecureTextEntry}
            placeholderTextColor={Slate}
            onFocus={_onFocus}
            onBlur={_onBlur}
            isFocused={isFocused}
            isError={error}
            autoCapitalize={'none'}
            type={type}
          />

          {icon ? icon() : null}

          {isPassword && (
            <ObfuscationToggle
              onPress={() => setSecureTextEntry(!isSecureTextEntry)}>
              {isSecureTextEntry ? <ObfuscationHide /> : <ObfuscationShow />}
            </ObfuscationToggle>
          )}
          {isSearch && (
            <SearchIconContainer>
              <Search />
            </SearchIconContainer>
          )}
        </InputContainer>

        <ErrorText>{errorMessage || ' '}</ErrorText>
      </>
    );
  },
);

export default BoxInput;
