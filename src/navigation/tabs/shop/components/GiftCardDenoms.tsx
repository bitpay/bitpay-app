import React from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../../../../components/styled/Text';
import {
  formatAmount,
  spreadAmounts,
} from '../../../../lib/gift-cards/gift-card';
import {CardConfig} from '../../../../store/shop/shop.models';

export const GiftCardDenomText = styled(BaseText)`
  font-size: 14px;
  font-weight: 300;
`;

export default ({cardConfig}: {cardConfig: CardConfig}) => {
  return (
    <GiftCardDenomText>
      {cardConfig.minAmount && cardConfig.maxAmount && (
        <>
          {formatAmount(cardConfig.minAmount, cardConfig.currency, {
            customPrecision: 'minimal',
          })}
          &nbsp;—&nbsp;
          {formatAmount(cardConfig.maxAmount, cardConfig.currency, {
            customPrecision: 'minimal',
          })}
        </>
      )}
      {cardConfig.supportedAmounts && (
        <>{spreadAmounts(cardConfig.supportedAmounts, cardConfig.currency)}</>
      )}
    </GiftCardDenomText>
  );
};
