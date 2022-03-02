import React, {ReactElement, useState} from 'react';
import styled from 'styled-components/native';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import {H7} from '../../../components/styled/Text';
import ArrowDownSvg from '../../../../assets/img/chevron-down.svg';
import ArrowUpSvg from '../../../../assets/img/chevron-up.svg';

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
  const [toggleArrow, setToggleArrow] = useState(false);
  const _onPress = () => {
    setToggleArrow(!toggleArrow);
    if (onPress) {
      onPress();
    }
  };
  return (
    <PillContainer disabled={!onPress} onPress={_onPress}>
      {icon}
      <PillText numberOfLines={1} ellipsizeMode={'tail'}>
        {description}
      </PillText>

      {onPress ? (
        toggleArrow ? (
          <ArrowUpSvg width={12} height={12} />
        ) : (
          <ArrowDownSvg width={12} height={12} />
        )
      ) : null}
    </PillContainer>
  );
};

export default SendToPill;
