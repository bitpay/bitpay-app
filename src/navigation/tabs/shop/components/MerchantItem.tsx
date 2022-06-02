import React, {useCallback, useState} from 'react';
import TagSvg from '../../../../../assets/img/tag.svg';
import styled, {css} from 'styled-components/native';
import {DirectIntegrationApiObject} from '../../../../store/shop/shop.models';
import {LightBlack, NeutralSlate} from '../../../../styles/colors';
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

const MerchantBox = styled.View<MerchantBoxProps>`
  ${({height, marginLeft, width}) =>
    css`
      background-color: ${({theme}) =>
        theme.dark ? LightBlack : NeutralSlate};
      border-radius: 21px;
      border-width: 1px;
      border-color: ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
      height: ${height}px;
      margin: 6px;
      ${marginLeft && `margin-left: ${marginLeft}px;`};
      overflow: hidden;
      width: ${width || (WIDTH - horizontalPadding * 2 - 24) / 2}px;
    `}
`;

const MerchantBoxBody = styled.View`
  padding: 16px;
  padding-bottom: 16px;
  flex-grow: 1;
`;

const MerchantName = styled(H6)`
  margin-top: 16px;
  line-height: 20px;
`;

const MerchantDescription = styled(Paragraph)`
  color: ${({theme}) => (theme.dark ? '#E1E4E7' : '#777777')};
  font-size: 12px;
  line-height: 16px;
  margin-top: 8px;
`;

const PromoFooter = styled.View`
  background-color: ${({theme}) => theme.colors.background};
  height: 48px;
  padding-left: 10px;
  padding-right: 20px;
  flex-direction: row;
  align-items: center;
`;

const PromoText = styled(BaseText)`
  font-size: 10px;
  font-weight: 500;
  margin-left: 8px;
`;

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
