import React from 'react';
import styled from 'styled-components/native';

import ProfileIcon from '../../../../components/avatar/Avatar';

import {CurrencyListIcons} from '../../../../constants/SupportedCurrencyOptions';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';

interface ContactSvgProps {
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

const ContactIcon: React.FC<ContactSvgProps> = ({coin, size = 50}) => {
  return (
    <ContactIconContainer>
      <ProfileIcon size={size} isContact={true} />
      {coin ? <CoinBadge coin={coin} size={size / 2.5} /> : null}
    </ContactIconContainer>
  );
};

export default ContactIcon;
