import React from 'react';
import * as Svg from 'react-native-svg';
import {useTheme} from 'styled-components/native';
import {Midnight, ProgressBlue} from '../../styles/colors';

interface ProfileIconProps {
  color?: Svg.Color;
  background?: Svg.Color;
  size?: number;
}

const ProfileIcon: React.FC<ProfileIconProps> = props => {
  let {background, color, size} = props;
  const theme = useTheme();

  size = size || 35;
  color = color || (theme.dark ? '#4989FF' : '#9FAFF5');
  background = background || (theme.dark ? Midnight : ProgressBlue);

  return (
    <Svg.Svg width={size} height={size} viewBox="0 0 50 50" fill="none">
      <Svg.Circle
        id="profile-background"
        cx="25"
        cy="25"
        r="25"
        fill={background}
      />

      <Svg.Mask
        id="mask0_27_2845"
        maskUnits={'userSpaceOnUse' as any}
        x="0"
        y="0"
        width="50"
        height="50">
        <Svg.Circle cx="25" cy="25" r="25" fill="#FFFFFF" />
      </Svg.Mask>

      <Svg.G mask="url(#mask0_27_2845)">
        <Svg.Path
          id="profile-head"
          fill={color}
          fillRule="evenodd"
          clipRule="evenodd"
          d="M25.3262 14.931C20.4619 14.931 16.5027 18.889 16.5027 23.7546C16.5027 28.6201 20.4619 32.5781 25.3262 32.5781C30.1905 32.5781 34.1497 28.6201 34.1497 23.7546C34.1497 18.889 30.1905 14.931 25.3262 14.931"
        />
        <Svg.Path
          id="profile-body"
          fill={color}
          fillRule="evenodd"
          clipRule="evenodd"
          d="M30.8032 35.363H19.0407C14.1668 35.363 10.2161 38.143 10.2161 41.5948V50.6406C14.6628 52.1584 19.6514 53.0101 24.9219 53.0101C30.1925 53.0101 35.1811 52.1584 39.6278 50.6406V41.5948C39.6278 38.1531 35.6918 35.363 30.8032 35.363Z"
        />
      </Svg.G>
    </Svg.Svg>
  );
};

export default ProfileIcon;
