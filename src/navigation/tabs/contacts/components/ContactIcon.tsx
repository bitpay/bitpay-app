import React, {ReactElement} from 'react';
import styled from 'styled-components/native';

import Avatar from '../../../../components/avatar/Avatar';

import {CurrencyListIcons} from '../../../../constants/SupportedCurrencyOptions';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {SUPPORTED_CURRENCIES} from '../../../../constants/currencies';
import {useAppSelector} from '../../../../utils/hooks';
import {RootState} from '../../../../store';
import {BitpaySupportedTokenOptsByAddress} from '../../../../constants/tokens';
import {Token} from '../../../../store/wallet/wallet.models';
import {
  addTokenChainSuffix,
  getBadgeImg,
} from '../../../../utils/helper-methods';
import {
  IsEVMChain,
  IsOtherChain,
} from '../../../../store/wallet/utils/currency';
import Blockie from '../../../../components/blockie/Blockie';

interface ContactIconProps {
  size?: number;
  name?: string;
  coin?: string;
  chain?: string;
  badge?: JSX.Element;
  tokenAddress?: string;
  address?: string;
}

interface BadgeProps {
  img: string | ((props?: any) => ReactElement);
  badgeImg: string | ((props?: any) => ReactElement);
  size?: number;
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
  tokenAddress,
  size = 50,
  name,
  badge,
  address,
}) => {
  const tokenOptionsByAddress = useAppSelector(({WALLET}: RootState) => {
    return {
      ...BitpaySupportedTokenOptsByAddress,
      ...WALLET.tokenOptionsByAddress,
      ...WALLET.customTokenOptionsByAddress,
    };
  }) as {[key in string]: Token};
  const foundToken =
    tokenAddress &&
    chain &&
    tokenOptionsByAddress[
      addTokenChainSuffix(tokenAddress.toLowerCase(), chain)
    ];

  const img =
    coin &&
    chain &&
    (!IsEVMChain(chain) || IsOtherChain(chain)) &&
    (CurrencyListIcons[coin]
      ? CurrencyListIcons[coin]
      : foundToken && foundToken?.logoURI
      ? (foundToken?.logoURI as string)
      : '');

  const coinBadge = img ? (
    <CoinBadgeContainer size={size}>
      <CurrencyImage
        img={img}
        badgeUri={getBadgeImg(coin, chain)}
        size={size / 2.5}
      />
    </CoinBadgeContainer>
  ) : chain && IsEVMChain(chain) ? (
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

export default ContactIcon;
