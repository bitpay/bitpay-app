import React, {useCallback, useState} from 'react';
import styled, {css} from 'styled-components/native';
import {DirectIntegrationApiObject} from '../../../../store/shop/shop.models';
import {NeutralSlate, SlateDark} from '../../../../styles/colors';
import RemoteIcon from './RemoteIcon';
import {H6, Paragraph} from '../../../../components/styled/Text';
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
      background-color: ${NeutralSlate};
      border-radius: 21px;
      height: ${height}px;
      margin: 16px 6px;
      ${marginLeft && `margin-left: ${marginLeft}px;`};
      padding: 16px;
      overflow: hidden;
      width: ${width || (WIDTH - horizontalPadding * 2 - 24) / 2}px;
    `}
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
  color: ${SlateDark};
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
  margin-top: 8px;
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
  const {caption, displayName, icon} = merchant;
  const [descriptionNumLines, setDescriptionNumLines] = useState(3);
  const onTextLayout = useCallback(
    e => setDescriptionNumLines(e.nativeEvent.lines.length > 1 ? 2 : 3),
    [],
  );
  return (
    <MerchantBox height={height} marginLeft={marginLeft} width={width}>
      <RemoteIcon icon={icon} height={26} />
      <MerchantName
        headerMargin={headerMargin}
        numberOfLines={2}
        onTextLayout={onTextLayout}>
        {displayName}
      </MerchantName>
      <MerchantDescription numberOfLines={descriptionNumLines}>
        {caption}
      </MerchantDescription>
    </MerchantBox>
  );
};
