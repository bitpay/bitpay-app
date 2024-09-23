import React from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../../../../components/styled/Text';
import {DirectoryDiscount} from '../../../../store/shop/shop.models';
import {formatFiatAmount} from '../../../../utils/helper-methods';
import {getBoostPercentage} from '../../../../lib/gift-cards/gift-card';

interface DiscountTextProps {
  color?: string;
  fontSize?: number;
  fontWeight?: number;
}

const DiscountText = styled(BaseText)<DiscountTextProps>`
  ${({fontSize}) => (fontSize ? `font-size: ${fontSize}px;` : '')};
  ${({fontWeight}) => `font-weight: ${fontWeight ?? 600};`};
  ${({color}) => (color ? `color: ${color};` : '')};
`;

const getDisplayablePercentage = (percentage: number) => {
  return parseFloat((getBoostPercentage(percentage!) * 100).toFixed(1));
};

const ShopDiscountText = ({
  discount,
  color,
  short,
  applied,
  fontSize,
  fontWeight,
}: {
  discount: DirectoryDiscount;
  color?: string;
  short?: boolean;
  applied?: boolean;
  fontSize?: number;
  fontWeight?: number;
}) => {
  return (
    <DiscountText color={color} fontSize={fontSize} fontWeight={fontWeight}>
      {discount.type === 'custom' ? (
        <>{discount.value}</>
      ) : (
        <>
          {applied ? <>+</> : null}
          {!short && discount.displayType === 'discount' ? <>Save </> : null}
          {discount.type === 'percentage' ? (
            <>
              {discount.displayType === 'boost'
                ? getDisplayablePercentage(discount.amount!)
                : discount.amount}
              %
            </>
          ) : (
            <>
              {formatFiatAmount(discount.amount!, discount.currency, {
                customPrecision: 'minimal',
              })}
            </>
          )}{' '}
          {discount.displayType === 'discount' ? (
            <>off every purchase</>
          ) : discount.displayType === 'boost' ? (
            <>boost {applied ? <>applied</> : null}</>
          ) : null}
        </>
      )}
    </DiscountText>
  );
};

export default ShopDiscountText;
