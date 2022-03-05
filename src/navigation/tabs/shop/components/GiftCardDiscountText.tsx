import React from 'react';
import styled, {useTheme} from 'styled-components/native';
import {BaseText} from '../../../../components/styled/Text';
import {CardConfig, GiftCardDiscount} from '../../../../store/shop/shop.models';
import {Action, ProgressBlue} from '../../../../styles/colors';
import {isDark} from '../../../../utils/color';
import {formatFiatAmount} from '../../../../utils/helper-methods';

interface DiscountTextProps {
  color: string;
}

const DiscountText = styled(BaseText)<DiscountTextProps>`
  font-weight: 600;
  color: ${({color}) => color};
`;

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
    <DiscountText color={color || getDiscountTextColor()}>
      {!short ? <>Save </> : null}
      {discount.type === 'percentage' ? (
        <>{discount.amount}%</>
      ) : (
        <>
          {formatFiatAmount(discount.amount, cardConfig.currency, {
            customPrecision: 'minimal',
          })}
        </>
      )}{' '}
      off every purchase
    </DiscountText>
  );
};

export default GiftCardDiscountText;
