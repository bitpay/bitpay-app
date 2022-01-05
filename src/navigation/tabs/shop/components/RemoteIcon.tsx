import React from 'react';
import styled, {css} from 'styled-components/native';
import {SvgUri} from 'react-native-svg';

interface IconParams {
  height: number;
}
const IconContainer = styled.View<IconParams>`
  ${({height}) => css`
    border-radius: 30px;
    overflow: hidden;
    margin-right: 18px;
    height: ${height}px;
    width: ${height}px;
  `}
`;

const Icon = styled.Image`
  ${({height}) => css`
    height: ${height}px;
    width: ${height}px;
  `}
`;

export default ({icon, height}: {icon: string; height: number}) => {
  return (
    <IconContainer height={height}>
      {icon.endsWith('.svg') ? (
        <SvgUri height={`${height}px`} width={`${height}px`} uri={icon} />
      ) : (
        <Icon height={height} source={{uri: icon}} />
      )}
    </IconContainer>
  );
};
