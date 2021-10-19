import BackIcon from '../../../assets/img/back.svg';
import React from 'react';
import {Platform} from 'react-native';
import styled, {css} from 'styled-components/native';

interface Props {
  platform: string;
}

const BackContainer = styled.View`
  padding-top: 10px;
  transform: scale(1.1);
  ${({platform}: Props) =>
    platform === 'ios' &&
    css`
      padding-left: 15px;
    `}
`;

const Back = () => {
  return (
    <BackContainer platform={Platform.OS}>
      <BackIcon />
    </BackContainer>
  );
};

export default Back;
