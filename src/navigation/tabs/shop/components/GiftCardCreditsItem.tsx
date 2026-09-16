import React, {useState} from 'react';
import {useTheme} from '../../../../contexts';
import {BitPayTheme} from '../../../../themes/bitpay';
import {Image, StyleSheet, View} from 'react-native';
import ErrorBoundary from 'react-native-error-boundary';
import {SvgUri} from 'react-native-svg';
import {CardConfig} from '../../../../store/shop/shop.models';
import {BaseText, H4} from '../../../../components/styled/Text';
import {formatFiatAmount} from '../../../../utils/helper-methods';
import {White, Black, LightBlack, Slate30} from '../../../../styles/colors';
import LinearGradient from 'react-native-linear-gradient';

interface GiftCardCreditsItemProps {
  logoBackgroundColor: string;
}

const hasWhiteBg = (logoBackgroundColor: string) =>
  logoBackgroundColor.toLowerCase() === '#ffffff';

const hasBlackBg = (logoBackgroundColor: string) =>
  logoBackgroundColor.toLowerCase() === '#000000';

const getBorderColor = (logoBackgroundColor: string, theme: BitPayTheme) => {
  if (theme.dark && hasBlackBg(logoBackgroundColor)) {
    return LightBlack;
  }
  if (!theme.dark && hasWhiteBg(logoBackgroundColor)) {
    return Slate30;
  }
  return 'transparent';
};

const logoHeight = 55;

const styles = StyleSheet.create({
  giftCardItem: {
    overflow: 'hidden',
    borderRadius: 30,
    borderWidth: 0.4,
    marginTop: 10,
    marginBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    height: logoHeight,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  logo: {
    height: logoHeight,
    marginLeft: 10,
  },
  giftCardAmount: {
    fontSize: 18,
    fontWeight: '700',
    flexGrow: 1,
    marginRight: 20,
    textAlign: 'right',
  },
  placeholderText: {
    color: White,
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
});

const GiftCardItem = ({
  logoBackgroundColor,
  style,
  ...rest
}: GiftCardCreditsItemProps & React.ComponentProps<typeof LinearGradient>) => {
  const theme = useTheme();
  return (
    <LinearGradient
      style={[
        styles.giftCardItem,
        {
          backgroundColor: logoBackgroundColor,
          borderColor: getBorderColor(logoBackgroundColor, theme),
        },
        style,
      ]}
      {...rest}
    />
  );
};

const LogoContainer = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.logoContainer, style]} {...rest} />
);

const Logo = ({style, ...rest}: React.ComponentProps<typeof Image>) => (
  <Image style={[styles.logo, style]} {...rest} />
);

const GiftCardAmount = ({
  logoBackgroundColor,
  style,
  ...rest
}: GiftCardCreditsItemProps & React.ComponentProps<typeof BaseText>) => (
  <BaseText
    style={[
      styles.giftCardAmount,
      {color: hasWhiteBg(logoBackgroundColor) ? Black : White},
      style,
    ]}
    {...rest}
  />
);

const PlaceholderText = ({style, ...rest}: React.ComponentProps<typeof H4>) => (
  <H4 style={[styles.placeholderText, style]} {...rest} />
);

const convertCssGradientToReactNativeGradient = (
  logoBackgroundColor: string,
) => {
  if (!logoBackgroundColor.includes('linear-gradient')) {
    return {colors: [logoBackgroundColor, logoBackgroundColor]};
  }
  const cssGradientParts = logoBackgroundColor
    .slice(0, -1)
    .replace('linear-gradient(', '')
    .split(', ');
  const angle = cssGradientParts[0].includes('deg')
    ? parseFloat(cssGradientParts[0].replace('deg', ''))
    : undefined;
  const colorParts = angle ? cssGradientParts.slice(1) : cssGradientParts;
  const colors = colorParts.map(colorItem => colorItem.split(' ')[0]);
  const locations = colorParts.map(
    colorItem => parseFloat(colorItem.split(' ')[1].replace('%', '')) / 100,
  );
  return {angle, colors, locations};
};

export default (props: {cardConfig: CardConfig; amount: number}) => {
  const {cardConfig, amount} = props;
  const logoBackgroundColor = cardConfig?.logoBackgroundColor || Black;
  const {angle, colors, locations} =
    convertCssGradientToReactNativeGradient(logoBackgroundColor);
  const [logoWidth, setLogoWidth] = useState(100);
  const [logoWidthComputed, setLogoWidthComputed] = useState(false);
  return (
    <GiftCardItem
      logoBackgroundColor={colors[0]}
      colors={colors}
      locations={locations}
      useAngle={!!angle}
      angle={angle}>
      <LogoContainer>
        {cardConfig ? (
          <>
            {cardConfig.logo?.endsWith('.svg') ? (
              <ErrorBoundary
                FallbackComponent={() => (
                  <PlaceholderText>{cardConfig.displayName}</PlaceholderText>
                )}>
                <SvgUri height={`${logoHeight}px`} uri={cardConfig.logo} />
              </ErrorBoundary>
            ) : (
              <Logo
                style={{width: logoWidth, opacity: logoWidthComputed ? 1 : 0}}
                onLoad={event => {
                  const height = event?.nativeEvent?.source?.height;
                  const width = event?.nativeEvent?.source?.width;
                  if (!height || !width) {
                    return;
                  }
                  const scaleFactor = logoHeight / height;
                  setLogoWidth(width * scaleFactor);
                  setLogoWidthComputed(true);
                }}
                resizeMode={'contain'}
                source={{uri: cardConfig.logo}}
              />
            )}
          </>
        ) : (
          <PlaceholderText>Gift Card</PlaceholderText>
        )}
      </LogoContainer>
      <GiftCardAmount logoBackgroundColor={logoBackgroundColor}>
        {formatFiatAmount(amount, cardConfig.currency, {
          customPrecision: 'minimal',
          currencyDisplay: 'symbol',
        })}
      </GiftCardAmount>
    </GiftCardItem>
  );
};
