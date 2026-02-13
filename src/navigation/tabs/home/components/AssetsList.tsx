import React from 'react';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../../components/styled/Containers';
import AssetRow from './AssetRow';
import {AssetRowItem} from '../../../../utils/portfolio/assets';

const List = styled.View`
  margin: 10px ${ScreenGutter} 10px;
`;

interface Props {
  items: AssetRowItem[];
  isFiatLoading?: boolean;
  isPopulateLoading?: boolean;
  isPopulateLoadingByKey?: Record<string, boolean>;
}

const AssetsList: React.FC<Props> = ({
  items,
  isFiatLoading,
  isPopulateLoading,
  isPopulateLoadingByKey,
}) => {
  return (
    <List>
      {items.map((item, index) => {
        const isRowPopulateLoading =
          typeof isPopulateLoadingByKey?.[item.key] === 'boolean'
            ? isPopulateLoadingByKey[item.key]
            : isPopulateLoading;

        return (
          <AssetRow
            key={item.key}
            item={item}
            isLast={index === items.length - 1}
            isFiatLoading={isFiatLoading}
            isPopulateLoading={isRowPopulateLoading}
          />
        );
      })}
    </List>
  );
};

export default AssetsList;
