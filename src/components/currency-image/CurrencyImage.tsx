// renders svg if supported currency or cached png if custom token
import React, {ReactElement, useMemo} from 'react';
import {StyleSheet} from 'react-native';
import {ImageRequireSource, Image} from 'react-native';
import styled from 'styled-components/native';
import DefaultImage from '../../../assets/img/currencies/default.svg';
import CoinbaseSvg from '../../../assets/img/logos/coinbase.svg';
import ProfileIcon from '../avatar/ProfileIcon';

interface CurrencyImageProps {
  img: string | ((props?: any) => ReactElement);
  imgSrc?: ImageRequireSource;
  size?: number;
  badgeUri?: string | ((props?: any) => ReactElement);
  badgeSrc?: ImageRequireSource;
}

const CurrencyImageContainer = styled.View`
  position: relative;
`;

const BadgeContainer = styled.View<{size?: number}>`
  height: ${({size = 54}) => size}%;
  width: ${({size = 54}) => size}%;
  position: absolute;
  right: 0;
  bottom: 0;
`;

const styles = StyleSheet.create({
  badge: {
    height: '100%',
    width: '100%',
  },
});

export const CurrencyImage: React.VFC<CurrencyImageProps> = ({
  img,
  imgSrc,
  badgeUri,
  badgeSrc,
  size = 40,
}) => {
  const style = {width: size, height: size};

  const badge = useMemo(
    () =>
      badgeSrc || badgeUri ? (
        <BadgeContainer>
          {badgeSrc ? (
            <Image style={styles.badge} source={badgeSrc} />
          ) : badgeUri ? (
            typeof badgeUri === 'string' ? (
              <Image
                style={styles.badge}
                source={{
                  uri: badgeUri,
                }}
              />
            ) : (
              badgeUri(styles.badge)
            )
          ) : null}
        </BadgeContainer>
      ) : null,
    [badgeSrc, badgeUri],
  );

  return (
    <CurrencyImageContainer>
      {!img && !imgSrc ? (
        <DefaultImage {...style} />
      ) : imgSrc ? (
        <Image style={style} source={imgSrc} />
      ) : typeof img === 'string' ? (
        img === 'coinbase' ? (
          <CoinbaseSvg width="20" height="20" />
        ) : img === 'contact' ? (
          <ProfileIcon size={20} />
        ) : (
          <Image
            style={style}
            source={{
              uri: img,
            }}
          />
        )
      ) : (
        img(style)
      )}

      {badge}
    </CurrencyImageContainer>
  );
};
