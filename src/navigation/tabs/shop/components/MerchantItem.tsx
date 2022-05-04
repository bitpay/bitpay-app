import React, {useCallback, useState} from 'react';
import TagSvg from '../../../../../assets/img/tag.svg';
import styled, {css} from 'styled-components/native';
import {DirectIntegrationApiObject} from '../../../../store/shop/shop.models';
import {LightBlack, NeutralSlate} from '../../../../styles/colors';
import RemoteImage from './RemoteImage';
import {BaseText, H6, Paragraph} from '../../../../components/styled/Text';
import {WIDTH} from '../../../../components/styled/Containers';
import {horizontalPadding} from './styled/ShopTabComponents';
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

interface MerchantNameProps {
  headerMargin: number;
}

const MerchantName = styled(H6)<MerchantNameProps>`
  ${({headerMargin}) =>
    css`
      margin-top: ${headerMargin}px;
      line-height: 18px;
    `}
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

interface MerchantItemProps extends MerchantBoxProps, MerchantNameProps {
  merchant: DirectIntegrationApiObject;
  headerMargin: number;
}

export default ({
  merchant,
  height,
  marginLeft,
  width,
  headerMargin,
}: MerchantItemProps) => {
  const {caption, displayName, icon, discount} = merchant;
  const [descriptionNumLines, setDescriptionNumLines] = useState(3);
  const onTextLayout = useCallback(
    e => setDescriptionNumLines(e.nativeEvent.lines.length > 1 ? 2 : 3),
    [],
  );
  return (
    <MerchantBox height={height} marginLeft={marginLeft} width={width}>
      <MerchantBoxBody>
        <RemoteImage uri={icon} height={26} borderRadius={30} />
        <MerchantName
          headerMargin={headerMargin}
          numberOfLines={2}
          onTextLayout={onTextLayout}>
          {displayName}
        </MerchantName>
        <MerchantDescription numberOfLines={descriptionNumLines}>
          {caption}
        </MerchantDescription>
      </MerchantBoxBody>
      {discount ? (
        <PromoFooter>
          <TagSvg />
          <PromoText>{discount.value}</PromoText>
        </PromoFooter>
      ) : null}
    </MerchantBox>
  );
};
