import React from 'react';
import {useTheme} from 'styled-components/native';
import {CardConfig, GiftCardDiscount} from '../../../../store/shop/shop.models';
import {Action, ProgressBlue} from '../../../../styles/colors';
import {isDark} from '../../../../utils/color';
import ShopDiscountText from './ShopDiscountText';

const GiftCardDiscountText = ({
  cardConfig,
  color,
  short,
}: {
  cardConfig: CardConfig;
  color?: string;
  short?: boolean;
}) => {
  const theme = useTheme();
  const discounts = cardConfig.discounts as GiftCardDiscount[];
  const discount = discounts[0];
  const brandColor =
    cardConfig.brandColor || cardConfig.logoBackgroundColor || Action;
  const getDiscountTextColor = () => {
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
    />
  );
};

export default GiftCardDiscountText;
