import React from 'react';
import styled, {css} from 'styled-components/native';
import {
  Caution,
  Caution25,
  NeutralSlate,
  Slate,
  Success,
  Success25,
  Warning,
  Warning25,
} from '../../styles/colors';
import {ScreenGutter} from '../styled/Containers';

type AlertType =
  | 'caution'
  | 'success'
  | 'warning'
  | 'default'
  | null
  | undefined;

interface AlertBoxProps {
  type?: AlertType;
}

type AlertPalette = {
  [k in Exclude<AlertType, null | undefined>]: {
    background: string;
    text: string;
  };
};

const palette: AlertPalette = {
  caution: {
    background: Caution25,
    text: Caution,
  },
  success: {
    background: Success25,
    text: Success,
  },
  warning: {
    background: Warning25,
    text: Warning,
  },
  default: {
    background: NeutralSlate,
    text: Slate,
  },
};

const AlertBoxContainer = styled.View<AlertBoxProps>`
  ${({type}) => {
    const {background, text} = palette[type || 'default'] || palette.default;

    return css`
      background-color: ${background};
      color: ${text};
    `;
  }}
  padding: ${ScreenGutter};
  border-radius: 4px;
`;

const AlertBoxMessage = styled.Text<AlertBoxProps>`
  color: ${({type}) => (palette[type || 'default'] || palette.default).text};
`;

const AlertBox: React.FC<AlertBoxProps> = props => {
  const {type = 'default', children} = props;

  return (
    <AlertBoxContainer type={type}>
      <AlertBoxMessage type={type}>{children}</AlertBoxMessage>
    </AlertBoxContainer>
  );
};

export default AlertBox;
