import React from 'react';
import styled, {css} from 'styled-components/native';
import {Action, Air, White} from '../../styles/colors';
import {TouchableOpacity} from 'react-native';
import BaseText from '../base-text/BaseText';
type ButtonStyle = 'primary' | 'secondary' | undefined;
type ButtonType = 'link' | 'pill' | undefined;

interface ButtonProps {
  buttonStyle?: ButtonStyle;
  buttonType?: ButtonType;
  children: string;
}

interface ContainerProps {
  secondary?: boolean;
  pill?: boolean;
}

interface TextProps {
  secondary?: boolean;
  pill?: boolean;
}

const Container = styled.TouchableOpacity`
  background: ${Action};
  border-radius: 12px;
  padding: 18px;
  ${({secondary}: ContainerProps) =>
    secondary &&
    css`
      background: transparent;
      border: 2px solid ${Action};
      border-radius: 6px;
      padding: 18px 28px;
    `}

  ${({pill}: ContainerProps) =>
    pill &&
    css`
      background: ${Air};
      border-radius: 17.5px;
      padding: 8px 15px;
    `}
`;

const Text = styled(BaseText)`
  font-weight: ${({pill}: TextProps) => (pill ? 400 : 500)};
  font-size: 18px;
  line-height: 25px;
  text-align: center;
  color: ${({secondary}: TextProps) => (secondary ? Action : White)};
`;

const Button = ({buttonStyle, buttonType, children}: ButtonProps) => {
  if (buttonType === 'link') {
    return (
      <TouchableOpacity>
        <Text secondary>{children}</Text>
      </TouchableOpacity>
    );
  }

  if (buttonType === 'pill') {
    return (
      <Container pill>
        <Text secondary pill>
          {children}
        </Text>
      </Container>
    );
  }

  if (buttonStyle === 'secondary') {
    return (
      <Container secondary>
        <Text secondary>{children}</Text>
      </Container>
    );
  }

  return (
    <Container>
      <Text>{children}</Text>
    </Container>
  );
};

export default Button;
