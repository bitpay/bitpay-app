import React from 'react';
import styled from 'styled-components/native';
import {
  currencySymbols,
  spreadAmounts,
} from '../../../../lib/gift-cards/gift-card';
import {CardConfig} from '../../../../store/shop/shop.models';

const GiftCardDenoms = styled.Text`
  font-size: 14px;
  font-weight: 300;
  padding-right: 50px;
`;

export default ({cardConfig}: {cardConfig: CardConfig}) => {
  return (
    <GiftCardDenoms>
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
    </GiftCardDenoms>
  );
};
