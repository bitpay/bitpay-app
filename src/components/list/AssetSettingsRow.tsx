import React, {ReactElement} from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../styled/Text';
import {useTheme} from '@react-navigation/native';
import {StyleProp, TextStyle} from 'react-native';

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
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};

  return (
    <Row>
      {asset.img()}
      <AssetName style={textStyle}>{asset.assetName}</AssetName>
    </Row>
  );
};

export default AssetSettingsRow;
