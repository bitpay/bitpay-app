import React from 'react';
import styled, {css} from 'styled-components/native';
import {SvgUri} from 'react-native-svg';
import {CardConfig} from '../../../../store/shop/shop.models';
import {BaseText, H4} from '../../../../components/styled/Text';
import {formatAmount} from '../../../../lib/gift-cards/gift-card';

interface GiftCardCreditsItemProps {
  logoBackgroundColor: string;
}

const hasWhiteBg = (logoBackgroundColor: string) =>
  logoBackgroundColor.toLowerCase() === '#ffffff';

const GiftCardItem = styled.View<GiftCardCreditsItemProps>`
  ${({logoBackgroundColor}) =>
    css`
      overflow: hidden;
      border-radius: 30px;
      border: 1.5px solid black;
      padding-right: 20px;
      margin-top: 10px;
      margin-bottom: 0px;
      display: flex;
      flex-direction: row;
      align-items: center;
      background-color: ${logoBackgroundColor};
      border-color: ${hasWhiteBg(logoBackgroundColor)
        ? '#d3d6da'
        : logoBackgroundColor};
      ${!hasWhiteBg(logoBackgroundColor) ? 'border: none;' : ''};
    `}
`;

const logoHeight = 55;

const LogoContainer = styled.View`
  flex-grow: 1;
`;

const Logo = styled.Image`
  height: ${logoHeight}px;
`;

const GiftCardAmount = styled(BaseText)<GiftCardCreditsItemProps>`
  ${({logoBackgroundColor}) =>
    css`
      font-size: 18px;
      font-weight: 700;
      flex-grow: 1;
      text-align: right;
      color: ${hasWhiteBg(logoBackgroundColor) ? 'black' : 'white'};
    `}
`;

const PlaceholderText = styled(H4)`
  color: white;
  padding: 12px 20px;
`;

export default (props: {cardConfig: CardConfig; amount: number}) => {
  const {cardConfig, amount} = props;
  const logo = cardConfig?.logo;
  const logoBackgroundColor = cardConfig?.logoBackgroundColor || 'black';
  return (
    <GiftCardItem logoBackgroundColor={logoBackgroundColor}>
      <LogoContainer>
        {logo ? (
          <>
            {logo.endsWith('.svg') ? (
              <SvgUri height={`${logoHeight}px`} uri={logo} />
            ) : (
              <Logo resizeMode={'contain'} source={{uri: logo}} />
            )}
          </>
        ) : (
          <PlaceholderText>Gift Card</PlaceholderText>
        )}
      </LogoContainer>
      <GiftCardAmount logoBackgroundColor={logoBackgroundColor}>
        {formatAmount(amount, cardConfig.currency, {
          customPrecision: 'minimal',
        })}
      </GiftCardAmount>
    </GiftCardItem>
  );
};
