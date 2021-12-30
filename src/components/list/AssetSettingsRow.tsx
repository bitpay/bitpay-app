import React, {ReactElement} from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../styled/Text';

export interface AssetSettingsRowProps {
  id: string;
  img: () => ReactElement;
  assetName: string;
}

const Row = styled.View`
  flex-direction: row;
  padding: 8px 0;
  align-items: center;
`;

const AssetName = styled(BaseText)`
  font-weight: 500;
  font-size: 18px;
  margin-left: 15px;
`;
const AssetSettingsRow = ({asset}: {asset: AssetSettingsRowProps}) => {
  return (
    <Row>
      {asset.img()}
      <AssetName>{asset.assetName}</AssetName>
    </Row>
  );
};

export default AssetSettingsRow;
