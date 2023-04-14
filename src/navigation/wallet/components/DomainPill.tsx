import React, {ReactElement, useState} from 'react';
import styled from 'styled-components/native';
import {LightBlack, Midnight, White} from '../../../styles/colors';
import {H7} from '../../../components/styled/Text';
import {ActiveOpacity} from '../../../components/styled/Containers';

interface Props {
  icon?: ReactElement;
  description: string;
  onPress?: () => void;
}

const PillContainer = styled.TouchableOpacity`
  background-color: ${({theme: {dark}}) => (dark ? Midnight : '#ECEFFD')};
  flex-direction: row;
  border-radius: 40px;
  align-items: center;
  justify-content: space-around;
  padding: 0 10px 0 10px;
  height: 28px;
  max-width: 117px;
`;

const PillText = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : LightBlack)};
  flex-direction: row;
  margin: 0px 10px;
`;

const DomainPill = ({icon, description, onPress}: Props) => {
  return (
    <PillContainer
      disabled={!onPress}
      onPress={onPress}
      activeOpacity={ActiveOpacity}>
      <PillText numberOfLines={1} ellipsizeMode={'middle'}>
        {description}
      </PillText>
      <>{icon}</>
    </PillContainer>
  );
};

export default DomainPill;
