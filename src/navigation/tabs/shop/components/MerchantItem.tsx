import React, {useCallback, useState} from 'react';
import TagSvg from '../../../../../assets/img/tag.svg';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../contexts';
import {DirectIntegrationApiObject} from '../../../../store/shop/shop.models';
import {
  LightBlack,
  NeutralSlate,
  Slate30,
  LuckySevens,
} from '../../../../styles/colors';
import RemoteImage from './RemoteImage';
import {BaseText, H6, Paragraph} from '../../../../components/styled/Text';
import {WIDTH} from '../../../../components/styled/Containers';
import {horizontalPadding} from './styled/ShopTabComponents';
import ShopDiscountText from './ShopDiscountText';
interface MerchantBoxProps {
  height: number;
  marginLeft?: number;
  width?: number;
}

const styles = StyleSheet.create({
  merchantBox: {
    borderRadius: 21,
    borderWidth: 1,
    margin: 6,
    overflow: 'hidden',
  },
  merchantBoxBody: {
    padding: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  merchantName: {
    marginTop: 16,
    lineHeight: 20,
  },
  merchantDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 8,
  },
  promoFooter: {
    height: 48,
    paddingLeft: 10,
    paddingRight: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 8,
  },
});

const MerchantBox = ({
  height,
  marginLeft,
  width,
  style,
  ...rest
}: MerchantBoxProps & React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.merchantBox,
        {
          backgroundColor: theme.dark ? LightBlack : NeutralSlate,
          borderColor: theme.dark ? LightBlack : NeutralSlate,
          height,
          width: width || (WIDTH - horizontalPadding * 2 - 24) / 2,
        },
        marginLeft ? {marginLeft} : null,
        style,
      ]}
      {...rest}
    />
  );
};

const MerchantBoxBody = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.merchantBoxBody, style]} {...rest} />
);

const MerchantName = ({style, ...rest}: React.ComponentProps<typeof H6>) => (
  <H6 style={[styles.merchantName, style]} {...rest} />
);

const MerchantDescription = ({
  style,
  ...rest
}: React.ComponentProps<typeof Paragraph>) => {
  const theme = useTheme();
  return (
    <Paragraph
      style={[
        styles.merchantDescription,
        {color: theme.dark ? Slate30 : LuckySevens},
        style,
      ]}
      {...rest}
    />
  );
};

const PromoFooter = ({style, ...rest}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.promoFooter,
        {backgroundColor: theme.colors.background},
        style,
      ]}
      {...rest}
    />
  );
};

const PromoText = ({style, ...rest}: React.ComponentProps<typeof BaseText>) => (
  <BaseText style={[styles.promoText, style]} {...rest} />
);

interface MerchantItemProps extends MerchantBoxProps {
  merchant: DirectIntegrationApiObject;
}

export default ({merchant, height, marginLeft, width}: MerchantItemProps) => {
  const {caption, displayName, icon, discount} = merchant;
  const hasDiscount =
    discount && ['percentage', 'flatrate', 'custom'].includes(discount.type);
  const [descriptionNumLines, setDescriptionNumLines] = useState(3);
  const onTextLayout = useCallback(
    e => {
      const numMerchantNameLines = e.nativeEvent.lines.length;
      const maxLines = height === 200 ? 5 : 4;
      const numLinesIfNoDiscount =
        numMerchantNameLines > 1 ? maxLines - 1 : maxLines;
      const numLines = discount
        ? numLinesIfNoDiscount - 2
        : numLinesIfNoDiscount;
      setDescriptionNumLines(numLines);
    },
    [discount, height],
  );
  return (
    <MerchantBox height={height} marginLeft={marginLeft} width={width}>
      <MerchantBoxBody>
        <RemoteImage uri={icon} height={26} borderRadius={30} />
        <MerchantName numberOfLines={2} onTextLayout={onTextLayout}>
          {displayName}
        </MerchantName>
        <MerchantDescription numberOfLines={descriptionNumLines}>
          {caption}
        </MerchantDescription>
      </MerchantBoxBody>
      {hasDiscount ? (
        <PromoFooter>
          <TagSvg />
          <PromoText>
            <ShopDiscountText discount={discount} />
          </PromoText>
        </PromoFooter>
      ) : null}
    </MerchantBox>
  );
};
