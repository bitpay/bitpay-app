import React from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../../../../components/styled/Text';
import {
  currencySymbols,
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
          {currencySymbols[cardConfig.currency] ? (
            <>
              {currencySymbols[cardConfig.currency]}
              {cardConfig.minAmount} - {currencySymbols[cardConfig.currency]}
              {cardConfig.maxAmount}
            </>
          ) : (
            <>
              {cardConfig.minAmount} {cardConfig.currency} -{' '}
              {cardConfig.maxAmount} {cardConfig.currency}
            </>
          )}
        </>
      )}
      {cardConfig.supportedAmounts && (
        <>{spreadAmounts(cardConfig.supportedAmounts, cardConfig.currency)}</>
      )}
    </GiftCardDenomText>
  );
};
