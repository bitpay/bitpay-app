import React, {ReactElement} from 'react';
import styled from 'styled-components/native';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import {H7} from '../../../components/styled/Text';
import ArrowDownSvg from '../../../../assets/img/chevron-down.svg';

interface Props {
  icon: ReactElement;
  description: string;
  onPress?: () => void;
}

const PillContainer = styled.Pressable`
  width: 150px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  flex-direction: row;
  border-radius: 40px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 15px;
`;

const PillText = styled(H7)`
  width: 95px;
  padding: 0 5px;
`;

const SendToPill = ({icon, description, onPress}: Props) => {
  return (
    <PillContainer disabled={!onPress} onPress={onPress}>
      {icon}
      <PillText numberOfLines={1} ellipsizeMode={'tail'}>
        {description}
      </PillText>

      {onPress ? <ArrowDownSvg width={12} height={12} /> : null}
    </PillContainer>
  );
};

export default SendToPill;
