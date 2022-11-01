import React, {ReactElement, useState} from 'react';
import styled from 'styled-components/native';
import {BitPay, LightBlack, NeutralSlate} from '../../../styles/colors';
import {H7} from '../../../components/styled/Text';
import ArrowDownSvg from '../../../../assets/img/chevron-down.svg';
import ArrowUpSvg from '../../../../assets/img/chevron-up.svg';

interface Props {
  icon?: ReactElement;
  description: string;
  onPress?: () => void;
  dropDown?: boolean;
  accent?: 'action';
}

interface StyleProps {
  accent?: 'action';
}

const PillContainer = styled.Pressable<StyleProps>`
  background-color: ${({theme: {dark}, accent}) =>
    dark ? LightBlack : accent === 'action' ? '#ECEFFD' : NeutralSlate};
  flex-direction: row;
  border-radius: 40px;
  align-items: center;
  justify-content: center;
  padding: 0 11px;
  height: 100%;
  max-width: 200px;
`;

const IconContainer = styled.View`
  padding: 10px 0px;
`;

const PillText = styled(H7)<StyleProps>`
  ${({theme: {dark}, accent}) =>
    !dark && accent === 'action' ? `color: ${BitPay};` : ''};
  flex-direction: row;
  margin-left: 5px;
`;

const ArrowContainer = styled.View`
  margin-left: 8px;
`;

const SendToPill = ({icon, description, onPress, dropDown, accent}: Props) => {
  const [toggleArrow, setToggleArrow] = useState(false);
  const _onPress = () => {
    setToggleArrow(!toggleArrow);
    if (onPress) {
      onPress();
    }
  };
  return (
    <PillContainer disabled={!onPress} onPress={_onPress} accent={accent}>
      <IconContainer>{icon}</IconContainer>
      <PillText numberOfLines={1} ellipsizeMode={'tail'} accent={accent}>
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
