import React from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../../../../components/styled/Text';
import {spreadAmounts} from '../../../../lib/gift-cards/gift-card';
import {CardConfig} from '../../../../store/shop/shop.models';
import {formatFiatAmount} from '../../../../utils/helper-methods';
import {Black} from '../../../../styles/colors';

export const GiftCardDenomText = styled(BaseText)`
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? '#777777' : Black)};
`;

export default ({cardConfig}: {cardConfig: CardConfig}) => {
  return (
    <GiftCardDenomText>
      {cardConfig.minAmount && cardConfig.maxAmount && (
        <>
          {formatFiatAmount(cardConfig.minAmount, cardConfig.currency, {
            customPrecision: 'minimal',
            currencyDisplay: 'symbol',
          })}
          &nbsp;—&nbsp;
          {formatFiatAmount(cardConfig.maxAmount, cardConfig.currency, {
            customPrecision: 'minimal',
            currencyDisplay: 'symbol',
          })}
        </>
      )}
      {cardConfig.supportedAmounts && (
        <>{spreadAmounts(cardConfig.supportedAmounts, cardConfig.currency)}</>
      )}
    </GiftCardDenomText>
  );
};
