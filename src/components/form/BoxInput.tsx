import styled, {css} from 'styled-components/native';
import React, {useEffect, useState} from 'react';
import {BaseText} from '../styled/Text';
import {Action, Caution, Slate} from '../../styles/colors';
import ObfuscationShow from '../../../assets/img/obfuscation-show.svg';
import ObfuscationHide from '../../../assets/img/obfuscation-hide.svg';

interface ContainerProps {
  isFocused: boolean;
  isError?: boolean;
}

const Input = styled.TextInput`
  height: 55px;
  margin: 10px 0 0 0;
  border: 1px solid #e1e4e7;
  color: black;
  padding: 10px;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  font-weight: 500;
  ${({isFocused}: ContainerProps) =>
    isFocused &&
    css`
      background: #fafbff;
      border-color: #e6ebff;
      border-bottom-color: ${Action};
    `}

  ${({isError}: ContainerProps) =>
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

const Label = styled(BaseText)`
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  position: absolute;
  top: 0;
  left: 0;
  color: #434d5a;
`;
const InputContainer = styled.View`
  position: relative;
  padding: 10px 0;
`;

const ObfuscationToggle = styled.TouchableOpacity`
  position: absolute;
  right: 10px;
  top: 40px;
`;

interface Props {
  label?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  errors?: any;
  type?: 'password';
  [x: string]: any;
}
const BoxInput = ({label, onFocus, onBlur, error, type, ...props}: Props) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecureTextEntry, setSecureTextEntry] = useState(false);

  useEffect(() => {
    if (type === 'password') {
      setSecureTextEntry(true);
    }
  }, [type]);

  const _onFocus = () => {
    setIsFocused(true);
    onFocus && onFocus();
  };

  const _onBlur = () => {
    setIsFocused(false);
    onBlur && onBlur();
  };

  const errorMessage =
    error &&
    typeof error === 'string' &&
    error.charAt(0).toUpperCase() + error.slice(1);

  return (
    <InputContainer>
      {label && <Label>{label}</Label>}
      <Input
        {...props}
        secureTextEntry={isSecureTextEntry}
        placeholderTextColor={Slate}
        onFocus={_onFocus}
        onBlur={_onBlur}
        isFocused={isFocused}
        isError={error}
        autoCapitalize={'none'}
      />
      {type === 'password' && (
        <ObfuscationToggle
          onPress={() => setSecureTextEntry(!isSecureTextEntry)}>
          {isSecureTextEntry ? <ObfuscationHide /> : <ObfuscationShow />}
        </ObfuscationToggle>
      )}
      {errorMessage && <ErrorText>{errorMessage}</ErrorText>}
    </InputContainer>
  );
};

export default BoxInput;
