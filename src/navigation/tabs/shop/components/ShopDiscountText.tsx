import React from 'react';
import {useTranslation} from 'react-i18next';
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
  ${({fontSize}) =>
    fontSize ? `line-height: ${Math.round(fontSize * 1.3)}px;` : ''};
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
  const {t} = useTranslation();

  return (
    <DiscountText color={color} fontSize={fontSize} fontWeight={fontWeight}>
      {discount.type === 'custom' ? (
        <>{discount.value}</>
      ) : (
        <>
          {applied ? <>+</> : null}
          {!short && discount.displayType === 'discount' ? (
            <>{t('Save')} </>
          ) : null}
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
            <>{t('off every purchase')}</>
          ) : discount.displayType === 'boost' ? (
            <>
              {t('boost')} {applied ? <>{t('applied')}</> : null}
            </>
          ) : null}
        </>
      )}
    </DiscountText>
  );
};

export default ShopDiscountText;
