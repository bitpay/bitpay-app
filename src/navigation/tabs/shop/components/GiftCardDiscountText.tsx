import React from 'react';
import {useTheme} from 'styled-components/native';
import {CardConfig, GiftCardCoupon} from '../../../../store/shop/shop.models';
import {Action, ProgressBlue, Success} from '../../../../styles/colors';
import {isDark} from '../../../../utils/color';
import ShopDiscountText from './ShopDiscountText';
import {hasVisibleBoost} from '../../../../lib/gift-cards/gift-card';

const GiftCardDiscountText = ({
  cardConfig,
  color,
  short,
  applied,
  fontSize,
  fontWeight,
}: {
  cardConfig: CardConfig;
  color?: string;
  short?: boolean;
  applied?: boolean;
  fontSize?: number;
  fontWeight?: number;
}) => {
  const theme = useTheme();
  const coupons = cardConfig.coupons as GiftCardCoupon[];
  const discount = coupons[0];
  const brandColor =
    cardConfig.brandColor || cardConfig.logoBackgroundColor || Action;
  const getDiscountTextColor = () => {
    if (hasVisibleBoost(cardConfig)) {
      return theme.dark ? Success : '#0B754A';
    }
    if (brandColor.includes('linear-gradient')) {
      return ProgressBlue;
    }
    return ['#ffffff', '#000000'].includes(brandColor) ||
      (theme.dark && isDark(brandColor))
      ? ProgressBlue
      : brandColor;
  };
  return (
    <ShopDiscountText
      discount={discount}
      short={short}
      color={color || getDiscountTextColor()}
      applied={applied}
      fontSize={fontSize}
      fontWeight={fontWeight}
    />
  );
};

export default GiftCardDiscountText;
