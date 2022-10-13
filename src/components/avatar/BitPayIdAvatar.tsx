import React from 'react';
import * as Svg from 'react-native-svg';
import {useAppSelector} from '../../utils/hooks';
import Avatar, {AvatarProps} from './Avatar';

interface CheckIconProps {
  size?: Svg.NumberProp;
  color?: string;
  background?: string;
}

interface BitPayIdAvatarProps extends Pick<AvatarProps, 'size' | 'bright'> {}

const CheckIcon: React.FC<CheckIconProps> = ({
  size = '100%',
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

const BitPayIdAvatar: React.FC<BitPayIdAvatarProps> = ({
  size,
  bright = false,
}) => {
  const initials = useAppSelector(({APP, BITPAY_ID}) => {
    const user = BITPAY_ID.user[APP.network];
    const firstInitial = (user?.givenName || '').trim().charAt(0);
    const lastInitial = (user?.familyName || '').trim().charAt(0);

    return `${firstInitial}${lastInitial}`.toUpperCase();
  });

  const isVerified = false; // TODO
  const badge = isVerified ? <CheckIcon /> : null;

  return (
    <Avatar
      size={size}
      bright={bright}
      initials={initials}
      badge={() => badge}
    />
  );
};

export default BitPayIdAvatar;
