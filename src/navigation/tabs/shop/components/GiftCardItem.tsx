import React from 'react';
import styled from 'styled-components/native';
import {CardConfig} from '../../../../store/shop/shop.models';
import RemoteImage from './RemoteImage';
import GiftCardDenoms from './GiftCardDenoms';
import {BaseText} from '../../../../components/styled/Text';
import GiftCardDiscountText from './GiftCardDiscountText';
import {getVisibleCoupon} from '../../../../lib/gift-cards/gift-card';

const GiftCardItemContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 55px;
  margin: 16px 0 16px 20px;
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

export default ({cardConfig}: {cardConfig: CardConfig}) => {
  const {displayName, icon} = cardConfig;
  return (
    <GiftCardItemContainer>
      <RemoteImage uri={icon} height={50} borderRadius={30} />
      <BrandDetails>
        <GiftCardBrandName>{displayName}</GiftCardBrandName>
        {getVisibleCoupon(cardConfig) ? (
          <GiftCardDiscountText cardConfig={cardConfig} short={true} />
        ) : (
          <GiftCardDenoms cardConfig={cardConfig} />
        )}
      </BrandDetails>
    </GiftCardItemContainer>
  );
};
