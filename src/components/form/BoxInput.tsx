import React, {useState} from 'react';
import {TextInput, TextInputProps} from 'react-native';
import styled, {css, useTheme} from 'styled-components/native';
import ObfuscationHide from '../../../assets/img/obfuscation-hide.svg';
import ObfuscationShow from '../../../assets/img/obfuscation-show.svg';
import Search from '../../../assets/img/search.svg';
import {
  Action,
  Black,
  Caution,
  LightBlack,
  Slate,
  White,
} from '../../styles/colors';
import {BaseText} from '../styled/Text';

type InputType = 'password' | 'search';

interface InputProps {
  isFocused: boolean;
  isError?: boolean;
  type?: InputType;
}

const InputContainer = styled.View`
  justify-content: center;
  position: relative;
`;

const Input = styled.TextInput<InputProps>`
  height: 55px;
  border: 0.75px solid ${Slate};
  color: ${({theme}) => theme.colors.text};
  padding: 10px;
  ${({type}) =>
    type &&
    css`
      padding-right: ${type === 'search' ? 65 : 40}px;
    `};
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  font-weight: 500;
  ${({isFocused}) =>
    isFocused &&
    css`
      background: #fafbff;
      border-color: #e6ebff;
      border-bottom-color: ${Action};
      color: ${Black};
    `}

  ${({isError}) =>
    isError &&
    css`
      background: #fbf5f6;
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
  margin-top: 6px;
`;

const ObfuscationToggle = styled.TouchableOpacity`
  position: absolute;
  right: 10px;
`;

const SearchIconContainer = styled.View`
  position: absolute;
  right: 0;
  top: 31px;
  border-left-color: #eceffd;
  border-left-width: 1px;
  padding: 5px 15px;
`;

interface BoxInputProps extends TextInputProps {
  label?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  error?: any;
  type?: InputType;
}

const BoxInput = React.forwardRef<TextInput, BoxInputProps>(
  ({label, onFocus, onBlur, error, type, ...props}, ref) => {
    const theme = useTheme();
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
            style={{
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
            }}
          />
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

        {errorMessage ? <ErrorText>{errorMessage}</ErrorText> : null}
      </>
    );
  },
);

export default BoxInput;
