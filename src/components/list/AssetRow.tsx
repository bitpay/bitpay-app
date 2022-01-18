import React, {ReactElement} from 'react';
import {Column, AssetImageContainer, AssetColumn} from '../styled/Containers';
import {H5, SubText} from '../styled/Text';
import {RowContainer} from '../styled/Containers';
import styled from 'styled-components/native';
import NestedArrow from '../../../assets/img/nested-arrow.svg';

const BalanceColumn = styled(Column)`
  align-items: flex-end;
`;

const NestedArrowContainer = styled.View`
  align-items: center;
  justify-content: center;
  margin-right: 15px;
`;

export interface AssetRowProps {
  id: string;
  img: () => ReactElement;
  assetName: string;
  assetAbbreviation: string;
  cryptoBalance: number;
  fiatBalance: string;
  isToken?: boolean;
  keyId: string;
}

interface Props {
  id: string;
  asset: AssetRowProps;
  onPress: () => void;
}

const AssetRow = ({asset, onPress}: Props) => {
  const {
    assetName,
    assetAbbreviation,
    img,
    cryptoBalance,
    fiatBalance,
    isToken,
  } = asset;
  return (
    <RowContainer activeOpacity={0.75} onPress={onPress}>
      {isToken && (
        <NestedArrowContainer>
          <NestedArrow />
        </NestedArrowContainer>
      )}
      <AssetImageContainer>{img()}</AssetImageContainer>
      <AssetColumn>
        <H5>{assetName}</H5>
        <SubText>{assetAbbreviation}</SubText>
      </AssetColumn>
      <BalanceColumn>
        <H5>{cryptoBalance}</H5>
        <SubText>{fiatBalance}</SubText>
      </BalanceColumn>
    </RowContainer>
  );
};

export default AssetRow;
