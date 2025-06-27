import React, {useState} from 'react';
import styled, {css, DefaultTheme} from 'styled-components/native';
import ErrorBoundary from 'react-native-error-boundary';
import {SvgUri} from 'react-native-svg';
import {CardConfig} from '../../../../store/shop/shop.models';
import {BaseText, H4} from '../../../../components/styled/Text';
import {formatFiatAmount} from '../../../../utils/helper-methods';
import {LightBlack} from '../../../../styles/colors';
import LinearGradient from 'react-native-linear-gradient';

interface GiftCardCreditsItemProps {
  logoBackgroundColor: string;
}

const hasWhiteBg = (logoBackgroundColor: string) =>
  logoBackgroundColor.toLowerCase() === '#ffffff';

const hasBlackBg = (logoBackgroundColor: string) =>
  logoBackgroundColor.toLowerCase() === '#000000';

const getBorderColor = (logoBackgroundColor: string, theme: DefaultTheme) => {
  if (theme.dark && hasBlackBg(logoBackgroundColor)) {
    return LightBlack;
  }
  if (!theme.dark && hasWhiteBg(logoBackgroundColor)) {
    return '#E1E4E7';
  }
  return 'transparent';
};

const GiftCardItem = styled(LinearGradient)<GiftCardCreditsItemProps>`
  ${({logoBackgroundColor, theme}) =>
    css`
      overflow: hidden;
      border-radius: 30px;
      border-width: 0.4px;
      margin-top: 10px;
      margin-bottom: 0px;
      display: flex;
      flex-direction: row;
      align-items: center;
      background-color: ${logoBackgroundColor};
      border-color: ${getBorderColor(logoBackgroundColor, theme)};
    `}
`;

const logoHeight = 55;

const LogoContainer = styled.View`
  height: ${logoHeight}px;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  z-index: 1;
`;

const Logo = styled.Image`
  height: ${logoHeight}px;
  margin-left: 10px;
`;

const GiftCardAmount = styled(BaseText)<GiftCardCreditsItemProps>`
  ${({logoBackgroundColor}) =>
    css`
      font-size: 18px;
      font-weight: 700;
      flex-grow: 1;
      margin-right: 20px;
      text-align: right;
      color: ${hasWhiteBg(logoBackgroundColor) ? 'black' : 'white'};
    `}
`;

const PlaceholderText = styled(H4)`
  color: white;
  padding: 12px 30px;
`;

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
  const logoBackgroundColor = cardConfig?.logoBackgroundColor || 'black';
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
