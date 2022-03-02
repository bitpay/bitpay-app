import React from 'react';
import styled from 'styled-components/native';

import Avatar from '../../../../components/avatar/Avatar';

import {CurrencyListIcons} from '../../../../constants/SupportedCurrencyOptions';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';

interface ContactIconProps {
  size?: number;
  name?: string;
  coin: string;
}

interface BadgeProps {
  coin: string;
  size?: number;
}

const ContactIconContainer = styled.View`
  position: relative;
`;

const CoinBadgeContainer = styled.View`
  position: absolute;
  right: -13px;
  bottom: -1px;
`;

const CoinBadge: React.FC<BadgeProps> = ({coin, size = 20}) => {
  const img = CurrencyListIcons[coin];
  return (
    <CoinBadgeContainer>
      <CurrencyImage img={img} size={size} />
    </CoinBadgeContainer>
  );
};

const ContactIcon: React.FC<ContactIconProps> = ({coin, size = 50, name}) => {
  const badge = coin ? <CoinBadge coin={coin} size={size / 2.5} /> : null;
  const initials = name
    ? name
        .trim()
        .split(' ')
        .map(n => n.charAt(0))
        .join('')
        .toUpperCase()
    : '';

  return (
    <ContactIconContainer>
      <Avatar size={size} initials={initials} badge={() => badge} />
    </ContactIconContainer>
  );
};

export default ContactIcon;
