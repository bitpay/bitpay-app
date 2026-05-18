import React, {useMemo} from 'react';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../../components/styled/Containers';
import AssetRow from './AssetRow';
import {AssetRowItem} from '../../../../utils/portfolio/assets';
import {useAssetIconResolver} from '../hooks/useAssetIconResolver';
import {
  getAssetRowPnlLoading,
  getAssetRowPopulateLoading,
  shouldForceAssetListSkeleton,
} from './assetRowLoading';

const List = styled.View`
  margin: 10px ${ScreenGutter} 10px;
`;

interface Props {
  items: AssetRowItem[];
  isPnlLoading?: boolean;
  populateInProgress?: boolean;
  isPopulateLoadingByKey?: Record<string, boolean>;
  forceSkeleton?: boolean;
}

const AssetsList: React.FC<Props> = ({
  items,
  isPnlLoading,
  populateInProgress,
  isPopulateLoadingByKey,
  forceSkeleton,
}) => {
  const {getAssetIconData} = useAssetIconResolver();
  const shouldForceSkeletonMode = useMemo(() => {
    return shouldForceAssetListSkeleton({
      forceSkeleton,
    });
  }, [forceSkeleton]);
  return (
    <List>
      {items.map((item, index) => {
        const {img, imgSrc} = getAssetIconData(item);
        const isRowPopulateLoading = getAssetRowPopulateLoading({
          populateInProgress,
          showPnlPlaceholder: item.showPnlPlaceholder,
          rowLoadingByKey: isPopulateLoadingByKey,
          rowKey: item.key,
        });
        const isRowScopedPnlLoading = !!item.showScopedPnlLoading;
        const isRowPnlLoading = getAssetRowPnlLoading({
          isPnlLoading,
          isRowPopulateLoading,
          showScopedPnlLoading: isRowScopedPnlLoading,
        });

        return (
          <AssetRow
            key={item.key}
            item={item}
            isLast={index === items.length - 1}
            isPnlLoading={isRowPnlLoading}
            isPopulateLoading={isRowPopulateLoading}
            forceSkeleton={shouldForceSkeletonMode}
            img={img}
            imgSrc={imgSrc}
          />
        );
      })}
    </List>
  );
};

export default AssetsList;
