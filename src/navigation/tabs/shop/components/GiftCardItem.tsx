import React from 'react';
import styled from 'styled-components/native';
import TimeAgo from 'react-native-timeago';
import {CardConfig, GiftCard} from '../../../../store/shop/shop.models';
import RemoteImage from './RemoteImage';
import GiftCardDenoms, {GiftCardDenomText} from './GiftCardDenoms';
import {BaseText} from '../../../../components/styled/Text';
import {formatAmount} from '../../../../lib/gift-cards/gift-card';

const GiftCardItemContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 55px;
  margin: 16px 0;
  margin-left: 20px;
`;

const GiftCardBrandName = styled(BaseText)`
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 5px;
`;

const BrandDetails = styled.View`
  margin-left: 18px;
  padding-right: 45px;
`;

export default ({
  cardConfig,
  giftCard,
}: {
  cardConfig: CardConfig;
  giftCard?: GiftCard;
}) => {
  const {displayName, icon} = cardConfig;
  return (
    <GiftCardItemContainer>
      <RemoteImage uri={icon} height={50} borderRadius={30} />
      <BrandDetails>
        <GiftCardBrandName>
          {giftCard
            ? formatAmount(giftCard.amount, giftCard.currency)
            : displayName}
        </GiftCardBrandName>
        {giftCard ? (
          <GiftCardDenomText>
            <TimeAgo time={parseInt(giftCard.date, 10)} />
          </GiftCardDenomText>
        ) : (
          <GiftCardDenoms cardConfig={cardConfig} />
        )}
      </BrandDetails>
    </GiftCardItemContainer>
  );
};
