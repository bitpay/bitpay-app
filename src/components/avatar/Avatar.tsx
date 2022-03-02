import React from 'react';
import * as Svg from 'react-native-svg';
import styled from 'styled-components/native';
import {Midnight, ProgressBlue} from '../../styles/colors';
import ProfileIcon from './ProfileIcon';

export interface AvatarProps {
  size: number;
  initials?: string;
  badge?: () => JSX.Element | null;
}

interface InitialsProps {
  size?: number;
  initials: string;
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

const Initials: React.FC<InitialsProps> = ({size = 24, initials}) => {
  return (
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
        fill={ProgressBlue}
        fontSize="11"
        fontWeight="500"
        x="12"
        y="16"
        textAnchor="middle">
        {initials}
      </Svg.Text>
    </Svg.Svg>
  );
};

export const Avatar: React.FC<AvatarProps> = props => {
  const {initials = '', size = 35, badge} = props;

  return (
    <AvatarContainer>
      {initials.length ? (
        <Initials size={size} initials={initials} />
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
