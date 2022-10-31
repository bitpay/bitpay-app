import React from 'react';
import * as Svg from 'react-native-svg';
import styled from 'styled-components/native';
import {Action, LinkBlue, Midnight, White} from '../../styles/colors';
import {BaseText} from '../styled/Text';
import ProfileIcon from './ProfileIcon';

export interface AvatarProps {
  size: number;
  initials?: string;
  badge?: () => JSX.Element | null;
  bright?: boolean;
}

interface InitialsProps {
  size?: number;
  initials: string;
  bright?: boolean;
}

const AvatarContainer = styled.View`
  position: relative;
`;

const BadgeContainer = styled.View<{size: number}>`
  position: absolute;
  height: ${({size}) => size}px;
  width: ${({size}) => size}px;
  right: 0;
  bottom: 0;
`;

const InitialsCircle = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? Action : Midnight)};
  height: ${77}px;
  width: ${77}px;
  border-radius: 50px;
  align-items: center;
  justify-content: center;
`;

const InitialsText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : LinkBlue)};
  font-size: 32px;
  font-weight: 500;
`;

const Initials: React.FC<InitialsProps> = ({
  size = 24,
  initials,
  bright = false,
}) => {
  return (
    <>
      {bright ? (
        <InitialsCircle>
          <InitialsText>{(initials || '').substring(0, 2)}</InitialsText>
        </InitialsCircle>
      ) : (
        <Svg.Svg height={size} width={size} viewBox="0 0 24 24">
          <Svg.Circle
            id="initials-background"
            fill={Midnight}
            r="12"
            cx="50%"
            cy="50%"
          />
          <Svg.Text
            id="initials-text"
            fill={LinkBlue}
            fontSize="11"
            fontWeight="600"
            x="12"
            y="16"
            textAnchor="middle">
            {(initials || '').substring(0, 2)}
          </Svg.Text>
        </Svg.Svg>
      )}
    </>
  );
};

export const Avatar: React.FC<AvatarProps> = props => {
  const {initials = '', size = 35, badge, bright} = props;

  return (
    <AvatarContainer>
      {initials.length ? (
        <Initials size={size} initials={initials} bright={bright} />
      ) : (
        <ProfileIcon size={size} />
      )}

      {badge ? (
        <BadgeContainer size={size * 0.35}>{badge()}</BadgeContainer>
      ) : null}
    </AvatarContainer>
  );
};

export default Avatar;
