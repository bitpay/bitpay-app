import React from 'react';
import {StyleSheet, View} from 'react-native';
import {CardConfig} from '../../../../store/shop/shop.models';
import RemoteImage from './RemoteImage';
import GiftCardDenoms from './GiftCardDenoms';
import {BaseText} from '../../../../components/styled/Text';
import GiftCardDiscountText from './GiftCardDiscountText';
import {getVisibleCoupon} from '../../../../lib/gift-cards/gift-card';

const styles = StyleSheet.create({
  giftCardItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 55,
    marginTop: 16,
    marginRight: 0,
    marginBottom: 16,
    marginLeft: 20,
  },
  giftCardBrandName: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '500',
    marginBottom: 3,
  },
  brandDetails: {
    marginLeft: 18,
    paddingRight: 45,
    gap: 3,
  },
});

const GiftCardItemContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.giftCardItemContainer, style]} {...rest} />
);

const GiftCardBrandName = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => (
  <BaseText style={[styles.giftCardBrandName, style]} {...rest} />
);

const BrandDetails = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.brandDetails, style]} {...rest} />
);

// Memoized: this screen isn't compiled by React Compiler (see babel.config's
// REACT_COMPILER_DIRS), so without memo a bucket change in the catalog
// re-renders every already-rendered row. cardConfig is a stable reference from
// the card-config map, so a shallow prop compare keeps rendered rows static.
const GiftCardItem = ({cardConfig}: {cardConfig: CardConfig}) => {
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

export default React.memo(GiftCardItem);
