import React, {ReactElement, useState} from 'react';
import styled from 'styled-components/native';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import {H7} from '../../../components/styled/Text';
import ArrowDownSvg from '../../../../assets/img/chevron-down.svg';
import ArrowUpSvg from '../../../../assets/img/chevron-up.svg';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';

interface Props {
  icon?: ReactElement;
  description: string;
  onPress?: () => void;
  dropDown?: boolean;
}

const PillContainer = styled.Pressable`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  flex-direction: row;
  border-radius: 40px;
  align-items: center;
  justify-content: center;
  padding: 0px 15px;
  max-width: 150px;
`;

const IconContainer = styled.View`
  padding: 10px 0px;
`;

const PillText = styled(H7)`
  margin-left: 5px;
`;

const ArrowContainer = styled.View`
  margin-left: 8px;
`;

const SendToPill = ({icon, description, onPress, dropDown}: Props) => {
  const [toggleArrow, setToggleArrow] = useState(false);
  const _onPress = () => {
    setToggleArrow(!toggleArrow);
    if (onPress) {
      onPress();
    }
  };
  return (
    <PillContainer disabled={!onPress} onPress={_onPress}>
      <IconContainer>{icon}</IconContainer>
      <PillText numberOfLines={1} ellipsizeMode={'tail'}>
        {description}
      </PillText>

      {dropDown ? (
        <ArrowContainer>
          {toggleArrow ? (
            <ArrowUpSvg width={12} height={12} />
          ) : (
            <ArrowDownSvg width={12} height={12} />
          )}
        </ArrowContainer>
      ) : null}
    </PillContainer>
  );
};

export default SendToPill;
