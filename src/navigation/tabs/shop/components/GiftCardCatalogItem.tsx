import React from 'react';
import {View} from 'react-native';
import styled from 'styled-components/native';
import {SvgUri} from 'react-native-svg';
import {CardConfig} from '../../../../store/shop/shop.models';
import GiftCardDenoms from './GiftCardDenoms';

const GiftCardCatalogItemContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 16px 0;
`;

const GiftCardIconContainer = styled.View`
  border-radius: 30px;
  overflow: hidden;
  margin-right: 18px;
`;

const iconHeight = 50;

const Icon = styled.Image`
  height: ${iconHeight}px;
  width: ${iconHeight}px;
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
      <GiftCardIconContainer>
        {icon.endsWith('.svg') ? (
          <SvgUri
            height={`${iconHeight}px`}
            width={`${iconHeight}px`}
            uri={icon}
          />
        ) : (
          <Icon source={{uri: icon}} />
        )}
      </GiftCardIconContainer>
      <View>
        <GiftCardBrandName>{displayName}</GiftCardBrandName>
        <GiftCardDenoms cardConfig={cardConfig} />
      </View>
    </GiftCardCatalogItemContainer>
  );
};
