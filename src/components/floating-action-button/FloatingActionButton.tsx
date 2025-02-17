import React, {PropsWithChildren} from 'react';
import {TouchableOpacityProps} from 'react-native';
import styled from 'styled-components/native';
import {Action, Disabled, DisabledDark, White} from '../../styles/colors';
import {ActiveOpacity} from '../styled/Containers';
import {H5} from '../styled/Text';
import {TouchableOpacity} from 'react-native-gesture-handler';

type hAlign = 'left' | 'right' | 'center' | null | undefined;
type vAlign = 'top' | 'bottom' | 'center' | null | undefined;

export type FloatingActionButtonProps = PropsWithChildren &
  TouchableOpacityProps & {
    icon?: React.ReactElement;
    onPress?: (e: any) => void;
    hAlign?: hAlign;
    vAlign?: vAlign;
    allowDisabledPress?: boolean;
  };

const FloatingActionButtonContainer = styled.View<{
  disabled?: boolean;
  hAlign?: hAlign;
  vAlign?: vAlign;
}>`
  align-items: center;
  position: absolute;
  justify-content: center;
  z-index: 1;
  ${props => {
    if (props.hAlign === 'right') {
      return `
        right: 20px;
      `;
    } else if (props.hAlign === 'center') {
      return `
        left: 0px;
        right: 0px;
      `;
    } else {
      return `
        left: 20px;
      `;
    }
  }}
  ${props => {
    if (props.vAlign === 'top') {
      return `
        top: 20px;
      `;
    } else if (props.vAlign === 'center') {
      return `
        top: 0px;
        bottom: 0px;
      `;
    } else {
      return `
        bottom: 20px;
      `;
    }
  }}
`;

const FloatingActionButtonTouchable = styled(TouchableOpacity)<{
  showAsDisabled?: boolean;
}>`
  align-items: center;
  background-color: ${props =>
    props.disabled || props.showAsDisabled ? Disabled : Action};
  border-radius: 50px;
  flex-direction: row;
  justify-content: center;
  min-width: 180px;
  padding: 18px;
`;

const FloatingActionButtonIconContainer = styled.View`
  margin-right: 10px;
`;

const FloatingActionButtonText = styled(H5)<{
  showAsDisabled?: boolean;
}>`
  color: ${props =>
    props.disabled || props.showAsDisabled ? DisabledDark : White};
`;

const FloatingActionButton: React.FC<FloatingActionButtonProps> = props => {
  return (
    <FloatingActionButtonContainer hAlign={props.hAlign} vAlign={props.vAlign}>
      <FloatingActionButtonTouchable
        onPress={e => props.onPress?.(e)}
        disabled={props.disabled && !props.allowDisabledPress}
        showAsDisabled={props.disabled && props.allowDisabledPress}
        activeOpacity={ActiveOpacity}>
        {props.icon ? (
          <FloatingActionButtonIconContainer>
            {props.icon}
          </FloatingActionButtonIconContainer>
        ) : null}
        <FloatingActionButtonText disabled={props.disabled}>
          {props.children}
        </FloatingActionButtonText>
      </FloatingActionButtonTouchable>
    </FloatingActionButtonContainer>
  );
};

export default FloatingActionButton;
