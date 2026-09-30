import React from 'react';
import {StyleSheet} from 'react-native';
import {useTheme} from '../../../../contexts';
import {BaseText} from '../../../../components/styled/Text';
import {spreadAmounts} from '../../../../lib/gift-cards/gift-card';
import {CardConfig} from '../../../../store/shop/shop.models';
import {formatFiatAmount} from '../../../../utils/helper-methods';
import {Black, LuckySevens} from '../../../../styles/colors';

const styles = StyleSheet.create({
  giftCardDenomText: {
    fontSize: 14,
    lineHeight: 18,
  },
});

export const GiftCardDenomText = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.giftCardDenomText,
        {color: theme.dark ? LuckySevens : Black},
        style,
      ]}
      {...rest}
    />
  );
};

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
