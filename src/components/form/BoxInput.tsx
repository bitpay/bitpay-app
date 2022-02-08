import React, {useState} from 'react';
import {TextInputProps} from 'react-native';
import styled, {css, useTheme} from 'styled-components/native';
import ObfuscationHide from '../../../assets/img/obfuscation-hide.svg';
import ObfuscationShow from '../../../assets/img/obfuscation-show.svg';
import Search from '../../../assets/img/search.svg';
import {Action, Black, Caution, Slate} from '../../styles/colors';
import {BitPayTheme} from '../../themes/bitpay';
import {BaseText} from '../styled/Text';

type InputType = 'password' | 'search';
interface ContainerProps {
  isFocused: boolean;
  isError?: boolean;
  type?: InputType;
}

const Input = styled.TextInput<ContainerProps>`
  height: 55px;
  margin: 10px 0 0 0;
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

const ErrorText = styled(BaseText)`
  color: ${Caution};
  font-size: 12px;
  font-weight: 500;
  position: absolute;
  bottom: -12px;
  left: 0;
  padding: 5px 0 0 10px;
`;

interface LabelProps {
  theme?: BitPayTheme;
}

const Label = styled(BaseText)<LabelProps>`
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  position: absolute;
  top: 0;
  left: 0;
  color: ${({theme}) => (theme && theme.dark ? theme.colors.text : '#434d5a')};
`;
const InputContainer = styled.View`
  position: relative;
  padding: 10px 0;
  background-color: transparent;
`;

const ObfuscationToggle = styled.TouchableOpacity`
  position: absolute;
  right: 10px;
  top: 40px;
`;

const SearchIconContainer = styled.View`
  position: absolute;
  right: 0;
  top: 31px;
  border-left-color: #eceffd;
  border-left-width: 1px;
  padding: 5px 15px;
`;

interface Props extends TextInputProps {
  label?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  error?: any;
  type?: InputType;
  [x: string]: any;
}

const BoxInput = ({label, onFocus, onBlur, error, type, ...props}: Props) => {
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
    typeof error === 'string' && error.charAt(0).toUpperCase() + error.slice(1);

  return (
    <InputContainer>
      {label && <Label>{label}</Label>}
      <Input
        {...props}
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
      {errorMessage && <ErrorText>{errorMessage}</ErrorText>}
    </InputContainer>
  );
};

export default BoxInput;
