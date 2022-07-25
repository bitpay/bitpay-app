import React, {ReactElement} from 'react';
import styled from 'styled-components/native';

import Avatar from '../../../../components/avatar/Avatar';

import {CurrencyListIcons} from '../../../../constants/SupportedCurrencyOptions';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {SUPPORTED_CURRENCIES} from '../../../../constants/currencies';
import {useAppSelector} from '../../../../utils/hooks';
import {RootState} from '../../../../store';
import {BitpaySupportedTokenOpts} from '../../../../constants/tokens';

interface ContactIconProps {
  size?: number;
  name?: string;
  coin: string;
}

interface BadgeProps {
  img: string | ((props?: any) => ReactElement);
  size?: number;
}

const ContactIconContainer = styled.View`
  position: relative;
`;

const CoinBadgeContainer = styled.View`
  position: absolute;
  right: -10px;
  bottom: -1px;
`;

const CoinBadge: React.FC<BadgeProps> = ({size = 20, img}) => {
  return (
    <CoinBadgeContainer>
      <CurrencyImage img={img} size={size} />
    </CoinBadgeContainer>
  );
};

const ContactIcon: React.FC<ContactIconProps> = ({coin, size = 45, name}) => {
  const tokenOptions = useAppSelector(({WALLET}: RootState) => {
    return {
      ...BitpaySupportedTokenOpts,
      ...WALLET.tokenOptions,
      ...WALLET.customTokenOptions,
    };
  });
  const img = SUPPORTED_CURRENCIES.includes(coin)
    ? CurrencyListIcons[coin]
    : tokenOptions && tokenOptions[coin]?.logoURI
    ? (tokenOptions[coin].logoURI as string)
    : '';

  const badge = coin ? <CoinBadge size={size / 2.5} img={img} /> : null;
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
