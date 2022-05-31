import React from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../../../../components/styled/Text';
import {DirectoryDiscount} from '../../../../store/shop/shop.models';
import {formatFiatAmount} from '../../../../utils/helper-methods';

interface DiscountTextProps {
  color?: string;
}

const DiscountText = styled(BaseText)<DiscountTextProps>`
  font-weight: 600;
  ${({color}) => (color ? `color: ${color};` : '')};
`;

const ShopDiscountText = ({
  discount,
  color,
  short,
}: {
  discount: DirectoryDiscount;
  color?: string;
  short?: boolean;
}) => {
  return (
    <DiscountText color={color}>
      {discount.type === 'custom' ? (
        <>{discount.value}</>
      ) : (
        <>
          {!short ? <>Save </> : null}
          {discount.type === 'percentage' ? (
            <>{discount.amount}%</>
          ) : (
            <>
              {formatFiatAmount(discount.amount!, discount.currency, {
                customPrecision: 'minimal',
              })}
            </>
          )}{' '}
          off every purchase
        </>
      )}
    </DiscountText>
  );
};

export default ShopDiscountText;
