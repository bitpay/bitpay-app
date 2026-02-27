// renders svg if supported currency or cached png if custom token
import React, {ReactElement, useEffect, useMemo, useState} from 'react';
import {StyleSheet} from 'react-native';
import {ImageRequireSource} from 'react-native';
import FastImage from 'react-native-fast-image';
import styled from 'styled-components/native';
import DefaultImage from '../../../assets/img/currencies/default.svg';
import CoinbaseSvg from '../../../assets/img/logos/coinbase.svg';
import ProfileIcon from '../avatar/ProfileIcon';
import Blockie from '../blockie/Blockie';

interface CurrencyImageProps {
  img?: string | ((props?: any) => ReactElement);
  imgSrc?: ImageRequireSource;
  size?: number;
  badgeUri?: string | ((props?: any) => ReactElement);
  badgeSrc?: ImageRequireSource;
  blockie?: {
    size?: number;
    seed?: string;
  };
}

const CurrencyImageContainer = styled.View`
  position: relative;
`;

const BadgeContainer = styled.View<{size?: number}>`
  height: ${({size = 54}) => size}%;
  width: ${({size = 54}) => size}%;
  position: absolute;
  right: -2px;
  bottom: 0;
`;

const styles = StyleSheet.create({
  badge: {
    height: '100%',
    width: '100%',
  },
});

export const CurrencyImage: React.FC<CurrencyImageProps> = ({
  img,
  imgSrc,
  badgeUri,
  badgeSrc,
  size = 40,
  blockie,
}) => {
  const dimensions = {width: size, height: size};
  const [imageError, setImageError] = useState(false);

  // If a source changes after an error, allow the new source to render again.
  useEffect(() => {
    setImageError(false);
  }, [img, imgSrc]);

  const badge = useMemo(
    () =>
      badgeSrc || badgeUri ? (
        <BadgeContainer>
          {badgeSrc ? (
            <FastImage
              style={styles.badge}
              source={badgeSrc}
              resizeMode={FastImage.resizeMode.contain}
            />
          ) : badgeUri ? (
            typeof badgeUri === 'string' ? (
              <FastImage
                style={styles.badge}
                source={{
                  uri: badgeUri,
                  priority: FastImage.priority.normal,
                }}
                resizeMode={FastImage.resizeMode.contain}
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
      {blockie ? (
        <Blockie size={blockie.size ?? size} seed={blockie.seed ?? 'random'} />
      ) : (!img && !imgSrc) || imageError ? (
        <DefaultImage {...dimensions} />
      ) : typeof img === 'function' ? (
        img(dimensions)
      ) : imgSrc ? (
        <FastImage
          style={dimensions}
          source={imgSrc}
          resizeMode={FastImage.resizeMode.cover}
          onError={() => setImageError(true)}
        />
      ) : typeof img === 'string' ? (
        img === 'coinbase' ? (
          <CoinbaseSvg width="20" height="20" />
        ) : img === 'contact' ? (
          <ProfileIcon size={20} />
        ) : (
          <FastImage
            style={dimensions}
            source={{
              uri: img,
              priority: FastImage.priority.normal,
            }}
            resizeMode={FastImage.resizeMode.contain}
            onError={() => setImageError(true)}
          />
        )
      ) : (
        <DefaultImage {...dimensions} />
      )}

      {badge}
    </CurrencyImageContainer>
  );
};
