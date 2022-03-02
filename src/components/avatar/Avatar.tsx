import React from 'react';
import * as Svg from 'react-native-svg';
import {useSelector} from 'react-redux';
import styled from 'styled-components/native';
import {RootState} from '../../store';
import {Midnight, ProgressBlue} from '../../styles/colors';
import ProfileIcon from './ProfileIcon';

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
  isContact?: boolean;
}

const AvatarContainer = styled.View`
  position: relative;
`;

const VerifiedCheckContainer = styled.View`
  position: absolute;
  right: 0;
  bottom: 0;
`;

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

const Avatar: React.FC<AvatarProps> = ({size, isContact}) => {
  const initials = useSelector<RootState, string>(({APP, BITPAY_ID}) => {
    if (!isContact) {
      const user = BITPAY_ID.user[APP.network];
      const firstInitial = (user?.givenName || '').trim().charAt(0);
      const lastInitial = (user?.familyName || '').trim().charAt(0);

      return `${firstInitial}${lastInitial}`.toUpperCase();
    } else {
      return ''; // Contacts no verified will use generic icon
    }
  });

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
