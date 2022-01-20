import React from 'react';
import styled from 'styled-components/native';
import {CardConfig} from '../../../../store/shop/shop.models';
import RemoteImage from './RemoteImage';
import GiftCardDenoms from './GiftCardDenoms';

const GiftCardCatalogItemContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 16px 0;
  margin-left: 20px;
`;

const GiftCardBrandName = styled.Text`
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 5px;
`;

const BrandDetails = styled.View`
  margin-left: 18px;
  padding-right: 10px;
`;

export default ({cardConfig}: {cardConfig: CardConfig}) => {
  const {displayName, icon} = cardConfig;
  return (
    <GiftCardCatalogItemContainer>
      <RemoteImage icon={icon} height={50} borderRadius={30} />
      <BrandDetails>
        <GiftCardBrandName>{displayName}</GiftCardBrandName>
        <GiftCardDenoms cardConfig={cardConfig} />
      </BrandDetails>
    </GiftCardCatalogItemContainer>
  );
};
