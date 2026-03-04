import React from 'react';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../../components/styled/Containers';
import AssetRow from './AssetRow';
import {AssetRowItem} from '../../../../utils/portfolio/assets';
import {useAssetIconResolver} from '../hooks/useAssetIconResolver';

const List = styled.View`
  margin: 10px ${ScreenGutter} 10px;
`;

interface Props {
  items: AssetRowItem[];
  isFiatLoading?: boolean;
  populateInProgress?: boolean;
  isPopulateLoadingByKey?: Record<string, boolean>;
}

const AssetsList: React.FC<Props> = ({
  items,
  isFiatLoading,
  populateInProgress,
  isPopulateLoadingByKey,
}) => {
  const {getAssetIconData} = useAssetIconResolver();

  return (
    <List>
      {items.map((item, index) => {
        const {img, imgSrc} = getAssetIconData(item);

        const isRowPopulateLoading =
          isPopulateLoadingByKey?.[item.key] ?? !!populateInProgress;

        return (
          <AssetRow
            key={item.key}
            item={item}
            isLast={index === items.length - 1}
            isFiatLoading={isFiatLoading}
            isPopulateLoading={isRowPopulateLoading}
            img={img}
            imgSrc={imgSrc}
          />
        );
      })}
    </List>
  );
};

export default AssetsList;
