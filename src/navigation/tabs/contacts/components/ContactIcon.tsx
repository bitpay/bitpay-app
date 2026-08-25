import React from 'react';
import styled from 'styled-components/native';

import Avatar from '../../../../components/avatar/Avatar';

import {CurrencyListIcons} from '../../../../constants/SupportedCurrencyOptions';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {getBadgeImg} from '../../../../utils/helper-methods';
import {IsVMChain, IsOtherChain} from '../../../../store/wallet/utils/currency';
import Blockie from '../../../../components/blockie/Blockie';

interface ContactIconProps {
  size?: number;
  name?: string;
  coin?: string;
  chain?: string;
  badge?: JSX.Element;
  address?: string;
}

const ContactIconContainer = styled.View`
  position: relative;
`;

const CoinBadgeContainer = styled.View<{size: number}>`
  position: absolute;
  right: ${({size}) =>
    size <= 20 ? '-1' : size === 45 || size === 30 ? '-13' : '-1'}px;
  bottom: -1px;
`;

const ContactIcon: React.FC<ContactIconProps> = ({
  coin,
  chain,
  size = 50,
  name,
  badge,
  address,
}) => {
  const img =
    coin &&
    chain &&
    (!IsVMChain(chain) || IsOtherChain(chain)) &&
    (CurrencyListIcons[coin] ? CurrencyListIcons[coin] : '');

  const coinBadge = img ? (
    <CoinBadgeContainer size={size}>
      <CurrencyImage
        img={img}
        badgeUri={getBadgeImg(coin, chain)}
        size={size / 2.5}
      />
    </CoinBadgeContainer>
  ) : chain && IsVMChain(chain) ? (
    <CoinBadgeContainer size={size}>
      <Blockie size={size / 2.5} seed={address} />
    </CoinBadgeContainer>
  ) : null;

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
      <Avatar
        size={size}
        initials={initials}
        badge={() => badge || coinBadge}
      />
    </ContactIconContainer>
  );
};

export default React.memo(ContactIcon);
