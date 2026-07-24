import React, {ReactElement, useMemo} from 'react';
import {StyleSheet, View} from 'react-native';

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
import {IsVMChain, IsOtherChain} from '../../../../store/wallet/utils/currency';
import Blockie from '../../../../components/blockie/Blockie';
import {useTokenContext} from '../../../../contexts';

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

const styles = StyleSheet.create({
  contactIconContainer: {
    position: 'relative',
  },
  coinBadgeContainer: {
    position: 'absolute',
    bottom: -1,
  },
});

const getCoinBadgeRight = (size: number) =>
  size <= 20 ? -1 : size === 45 || size === 30 ? -13 : -1;

const CoinBadgeContainer: React.FC<{
  size: number;
  children?: React.ReactNode;
}> = ({size, children}) => (
  <View style={[styles.coinBadgeContainer, {right: getCoinBadgeRight(size)}]}>
    {children}
  </View>
);

const ContactIcon: React.FC<ContactIconProps> = ({
  coin,
  chain,
  tokenAddress,
  size = 50,
  name,
  badge,
  address,
}) => {
  const {tokenOptionsByAddress: _tokenOptionsByAddress} = useTokenContext();

  const customTokenOptionsByAddress = useAppSelector(
    ({WALLET}: RootState) => WALLET.customTokenOptionsByAddress,
  );
  const tokenOptionsByAddress = useMemo(
    () =>
      ({
        ...BitpaySupportedTokenOptsByAddress,
        ..._tokenOptionsByAddress,
        ...customTokenOptionsByAddress,
      } as {[key in string]: Token}),
    [_tokenOptionsByAddress, customTokenOptionsByAddress],
  );
  const foundToken =
    tokenAddress &&
    chain &&
    tokenOptionsByAddress[
      // `addTokenChainSuffix` already lowercases non-SVM chains and must
      // preserve case-sensitive SVM mint addresses.
      addTokenChainSuffix(tokenAddress.trim(), chain)
    ];

  const img =
    coin &&
    chain &&
    (!IsVMChain(chain) || IsOtherChain(chain)) &&
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
    <View style={styles.contactIconContainer}>
      <Avatar
        size={size}
        initials={initials}
        badge={() => badge || coinBadge}
      />
    </View>
  );
};

export default ContactIcon;
