import React from 'react';
import {View} from 'react-native';
import styled from 'styled-components/native';
import {CardConfig} from '../../../../store/shop/shop.models';
import RemoteIcon from './RemoteIcon';
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

export default ({cardConfig}: {cardConfig: CardConfig}) => {
  const {displayName, icon} = cardConfig;
  return (
    <GiftCardCatalogItemContainer>
      <RemoteIcon icon={icon} height={50} />
      <View>
        <GiftCardBrandName>{displayName}</GiftCardBrandName>
        <GiftCardDenoms cardConfig={cardConfig} />
      </View>
    </GiftCardCatalogItemContainer>
  );
};
