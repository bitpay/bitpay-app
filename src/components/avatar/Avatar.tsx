import React from 'react';
import * as Svg from 'react-native-svg';
import {useSelector} from 'react-redux';
import styled, {useTheme} from 'styled-components/native';
import {RootState} from '../../store';
import {Midnight, NeutralSlate, ProgressBlue} from '../../styles/colors';

interface AvatarSvgProps {
  size?: number;
  color?: string;
  background?: string;
}

interface InitialsProps {
  size?: number;
  initials: string;
}

interface AvatarProps {
  size: number;
  name?: string;
}

const AvatarContainer = styled.View`
  position: relative;
`;

const VerifiedCheckContainer = styled.View`
  position: absolute;
  right: 0;
  bottom: 0;
`;

export const ProfileIcon: React.FC<AvatarSvgProps> = ({
  size = 35,
  color,
  background,
}) => {
  const theme = useTheme();

  color = color || (theme.dark ? ProgressBlue : NeutralSlate);
  background = background || (theme.dark ? Midnight : ProgressBlue);

  return (
    <Svg.Svg width={size} height={size} viewBox="0 0 35 35" fill="none">
      <Svg.Circle
        id="profile-background"
        cx="17.5"
        cy="17.5"
        r="17.5"
        fill={background}
      />

      <Svg.Mask
        id="mask0_175_9616"
        maskUnits={'userSpaceOnUse' as any}
        x="0"
        y="0"
        width="35"
        height="35">
        <Svg.Circle cx="17.5" cy="17.5" r="17.5" fill="white" />
      </Svg.Mask>

      <Svg.G mask="url(#mask0_175_9616)">
        <Svg.Path
          id="profile-head"
          fill={color}
          fillRule="evenodd"
          clipRule="evenodd"
          d="M17.7284 10.4517C14.3234 10.4517 11.5519 13.2223 11.5519 16.6282C11.5519 20.0341 14.3234 22.8047 17.7284 22.8047C21.1334 22.8047 23.9049 20.0341 23.9049 16.6282C23.9049 13.2223 21.1334 10.4517 17.7284 10.4517Z"
        />
        <Svg.Path
          id="profile-body"
          fill={color}
          fillRule="evenodd"
          clipRule="evenodd"
          d="M21.5622 24.7542H13.3284C9.91672 24.7542 7.15118 26.7001 7.15118 29.1164V35.4484C10.2639 36.5109 13.7559 37.1071 17.4453 37.1071C21.1347 37.1071 24.6267 36.5109 27.7394 35.4484V29.1164C27.7394 26.7072 24.9842 24.7542 21.5622 24.7542Z"
        />
      </Svg.G>
    </Svg.Svg>
  );
};

const CheckIcon: React.FC<AvatarSvgProps> = ({
  size = 24,
  color = '#fff',
  background = '#00a184',
}) => {
  return (
    <Svg.Svg height={size} width={size} viewBox="0 0 24 24" fill="none">
      <Svg.Circle id="verified-bg" fill={color} r="12" cx="50%" cy="50%" />
      <Svg.Path
        id="verified-checkmark"
        fill={background}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 12C0 5.37258 5.37258 0 12 0C18.6194 0.0192227 23.9808 5.38056 24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12ZM4.586 12L10 17.414L19.414 8L18 6.586L10 14.586L6 10.586L4.586 12Z"
      />
    </Svg.Svg>
  );
};

const VerifiedCheck: React.FC<AvatarProps> = ({size}) => {
  return (
    <VerifiedCheckContainer>
      <CheckIcon size={size} />
    </VerifiedCheckContainer>
  );
};

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

const getInitials = (name: string) => {
  var n = '';
  const nameArray = name.split(/(\s+)/);
  for (var i = 0; i < nameArray.length; i++) {
    const initial = nameArray[i].trim().charAt(0);
    if (initial && n.length < 2) {
      n = n + initial;
    }
  }
  return n.toUpperCase();
};

const Avatar: React.FC<AvatarProps> = ({size, name}) => {
  var initials: string = '';
  initials = useSelector<RootState, string>(({APP, BITPAY_ID}) => {
    const user = BITPAY_ID.user[APP.network];
    const firstInitial = (user?.givenName || '').trim().charAt(0);
    const lastInitial = (user?.familyName || '').trim().charAt(0);

    return `${firstInitial}${lastInitial}`.toUpperCase();
  });

  // Use name to display icon with initials
  if (name) {
    initials = getInitials(name);
    initials = ''; // Show generic icon for now
  }

  const isVerified = false; // TODO

  return (
    <AvatarContainer>
      {initials.length ? (
        <Initials size={size} initials={initials} />
      ) : (
        <ProfileIcon size={size} />
      )}
      {isVerified ? <VerifiedCheck size={size * 0.35} /> : null}
    </AvatarContainer>
  );
};

export default Avatar;
