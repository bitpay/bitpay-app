import {Asset} from '../../../../store/wallet/wallet.models';
import {AssetSelectionOptions} from '../../../../constants/AssetSelectionOptions';
import HomeCard from '../../../../components/home-card/HomeCard';
import React from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../../../../components/styled/Text';
import {Slate} from '../../../../styles/colors';

const HeaderImg = styled.View`
  align-items: center;
  justify-content: flex-start;
  flex-direction: row;
  flex: 1;
  flex-wrap: wrap;
`;

const Img = styled.View<{isFirst: boolean; size: string}>`
  width: ${({size}) => size};
  height: ${({size}) => size};
  min-height: 22px;
  margin-left: ${({isFirst}) => (isFirst ? 0 : '-5px')};
`;

const RemainingAssetsLabel = styled(BaseText)`
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
  line-height: 18px;
  letter-spacing: 0;
  color: ${Slate};
  margin-left: 5px;
`;
const ASSET_DISPLAY_LIMIT = 4;
const ICON_SIZE = 25;

const WalletCardComponent = ({
  assets,
  totalBalance,
  onPress,
}: {
  assets: Asset[];
  totalBalance: number;
  onPress: () => void;
}) => {
  const assetInfo = assets
    .slice(0, ASSET_DISPLAY_LIMIT)
    .map(asset => asset.assetAbbreviation)
    .map(currency =>
      AssetSelectionOptions.find(
        ({id}: {id: string | number}) => id === currency,
      ),
    );

  const remainingAssetCount =
    assets.length > ASSET_DISPLAY_LIMIT
      ? assets.length - ASSET_DISPLAY_LIMIT
      : undefined;

  const HeaderComponent = (
    <HeaderImg>
      {assetInfo &&
        assetInfo.map(
          (asset, index) =>
            asset && (
              <Img
                key={index}
                isFirst={index === 0}
                size={ICON_SIZE + 'px'}>
                {asset.roundIcon(ICON_SIZE)}
              </Img>
            ),
        )}
      {remainingAssetCount && (
        <RemainingAssetsLabel>
          + {remainingAssetCount} more
        </RemainingAssetsLabel>
      )}
    </HeaderImg>
  );

  return (
    <HomeCard
      header={HeaderComponent}
      body={{title: 'My Everything Wallet', value: `$${totalBalance}`}}
      onCTAPress={onPress}
    />
  );
};

export default WalletCardComponent;
